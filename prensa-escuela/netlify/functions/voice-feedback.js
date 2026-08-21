const { getStore } = require('@netlify/blobs');
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, x-press-password','Access-Control-Allow-Methods':'POST, OPTIONS'};
const store=()=>getStore({name:'articles',siteID:process.env.SITE_ID,token:process.env.BLOBS_TOKEN,consistency:'strong'});
const auth=e=>(e.headers['x-press-password']||e.headers['X-Press-Password'])===process.env.PRESS_PASSWORD&&!!process.env.PRESS_PASSWORD;
const json=(statusCode,body)=>({statusCode,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(body)});
exports.handler=async e=>{
 if(e.httpMethod==='OPTIONS')return{statusCode:200,headers:CORS,body:''};
 if(e.httpMethod!=='POST')return json(405,{error:'Método no permitido.'});
 if(!auth(e))return json(401,{error:'No autorizado.'});
 let d;try{d=JSON.parse(e.body||'{}')}catch{return json(400,{error:'Datos inválidos.'})}
 if(!d.id||!d.feedback)return json(400,{error:'Falta el texto de retroalimentación.'});
 const item=await store().get(`voice:${d.id}`,{type:'json'});
 if(!item)return json(404,{error:'Texto no encontrado.'});
 if(!item.email)return json(400,{error:'Este envío no tiene correo electrónico.'});
 if(!process.env.RESEND_API_KEY||!process.env.FEEDBACK_FROM_EMAIL){
   return json(503,{fallback:true,email:item.email,author:item.author,title:item.title,error:'El envío automático de correo no está configurado. Puedes usar la opción Abrir correo para enviar la retroalimentación.'});
 }
 const subject=`Retroalimentación sobre: ${item.title}`;
 const html=`<p>Hola ${escapeHtml(item.author)},</p><p>Gracias por enviar tu texto a <strong>Prensa Normalista</strong>.</p><p><strong>Retroalimentación:</strong></p><div style="white-space:pre-wrap">${escapeHtml(d.feedback)}</div><p>Saludos,<br>Equipo de Prensa Normalista</p>`;
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FEEDBACK_FROM_EMAIL,to:[item.email],subject,html})});
 const out=await r.json().catch(()=>({}));
 if(!r.ok)return json(502,{error:out.message||'El servicio de correo no pudo enviar el mensaje.',fallback:true,email:item.email});
 item.feedback=d.feedback.trim();item.feedbackAt=item.feedbackAt||new Date().toISOString();item.feedbackSentAt=new Date().toISOString();item.status='reviewed';
 const s=store();await s.setJSON(`voice:${item.id}`,item);
 const list=(await s.get('voices-index',{type:'json'}))||[];const i=list.findIndex(x=>x.id===item.id);if(i>=0)list[i]={...list[i],status:item.status,feedback:item.feedback,feedbackAt:item.feedbackAt,feedbackSentAt:item.feedbackSentAt};await s.setJSON('voices-index',list);
 return json(200,{ok:true,sentTo:item.email});
};
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
