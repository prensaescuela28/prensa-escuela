const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-press-password',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const store = () => getStore({
  name: 'articles',
  siteID: process.env.SITE_ID,
  token: process.env.BLOBS_TOKEN,
  consistency: 'strong'
});

const auth = e =>
  (e.headers['x-press-password'] || e.headers['X-Press-Password']) === process.env.PRESS_PASSWORD &&
  !!process.env.PRESS_PASSWORD;

function slugify(t) {
  return t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'')
    .replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,70) || 'voz';
}

function json(statusCode, body) {
  return { statusCode, headers: {...CORS, 'Content-Type':'application/json'}, body: JSON.stringify(body) };
}

exports.handler = async event => {
  const s = store();
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:CORS, body:'' };

  if (event.httpMethod === 'POST') {
    let d; try { d=JSON.parse(event.body||'{}'); } catch { return json(400,{error:'Datos inválidos.'}); }
    if (!d.title || !d.author || !d.grade || !d.type || !d.content || !d.email) {
      return json(400,{error:'Completa todos los campos obligatorios, incluido tu correo electrónico.'});
    }
    const email = String(d.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400,{error:'Escribe un correo electrónico válido.'});
    if (d.content.length < 80) return json(400,{error:'El texto debe tener al menos 80 caracteres.'});

    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const item = {
      id, title:d.title.trim(), author:d.author.trim(), email, grade:d.grade.trim(),
      type:d.type.trim(), content:d.content.trim(), submittedAt:new Date().toISOString(),
      status:'pending', feedback:'', feedbackAt:null, feedbackSentAt:null
    };
    await s.setJSON(`voice:${id}`, item);
    const pending=(await s.get('voices-index',{type:'json'}))||[];
    pending.unshift({
      id,title:item.title,author:item.author,email:item.email,grade:item.grade,type:item.type,
      submittedAt:item.submittedAt,status:'pending',feedback:item.feedback
    });
    await s.setJSON('voices-index',pending);
    return json(200,{ok:true});
  }

  if (!auth(event)) return json(401,{error:'No autorizado.'});

  if (event.httpMethod === 'GET') {
    const list=(await s.get('voices-index',{type:'json'}))||[];
    const full=await Promise.all(list.map(async x => {
      const item=await s.get(`voice:${x.id}`,{type:'json'});
      return item ? {
        id:item.id,title:item.title,author:item.author,email:item.email,grade:item.grade,type:item.type,
        content:item.content,submittedAt:item.submittedAt,status:item.status,
        feedback:item.feedback||'',feedbackAt:item.feedbackAt||null,feedbackSentAt:item.feedbackSentAt||null
      } : x;
    }));
    return json(200,full);
  }

  if (event.httpMethod === 'PUT') {
    let d; try { d=JSON.parse(event.body||'{}'); } catch { return json(400,{error:'Datos inválidos.'}); }
    if (!d.id) return json(400,{error:'Falta el identificador.'});
    const item=await s.get(`voice:${d.id}`,{type:'json'});
    if(!item) return json(404,{error:'Texto no encontrado.'});

    if (typeof d.feedback === 'string') {
      item.feedback=d.feedback.trim();
      item.feedbackAt=item.feedback ? new Date().toISOString() : null;
      item.status=item.feedback ? 'reviewed' : 'pending';
    }
    if (d.markFeedbackSent === true) item.feedbackSentAt=new Date().toISOString();
    await s.setJSON(`voice:${d.id}`,item);
    const list=(await s.get('voices-index',{type:'json'}))||[];
    const idx=list.findIndex(x=>x.id===d.id);
    if(idx>=0) list[idx]={...list[idx],status:item.status,feedback:item.feedback,feedbackAt:item.feedbackAt,feedbackSentAt:item.feedbackSentAt};
    await s.setJSON('voices-index',list);
    return json(200,{ok:true,item});
  }

  if (event.httpMethod === 'DELETE') {
    const id=event.queryStringParameters&&event.queryStringParameters.id;
    if(!id)return json(400,{error:'Falta el identificador.'});
    await s.delete(`voice:${id}`);
    const list=(await s.get('voices-index',{type:'json'}))||[];
    await s.setJSON('voices-index',list.filter(x=>x.id!==id));
    return json(200,{ok:true});
  }

  return {statusCode:405,headers:CORS,body:'Método no permitido'};
};
