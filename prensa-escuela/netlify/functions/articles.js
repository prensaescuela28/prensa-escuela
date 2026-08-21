const { getStore } = require('@netlify/blobs');

function slugify(text) {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'nota';
}
function getStoreSafe() {
  return getStore({ name: 'articles', siteID: process.env.SITE_ID, token: process.env.BLOBS_TOKEN, consistency: 'strong' });
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-press-password', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS' };
function auth(event) { return (event.headers['x-press-password'] || event.headers['X-Press-Password']) === process.env.PRESS_PASSWORD && !!process.env.PRESS_PASSWORD; }

exports.handler = async (event) => {
  const store = getStoreSafe();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  if (event.httpMethod === 'GET') {
    const q=event.queryStringParameters||{};
    if(q.slug){ if(!auth(event)) return {statusCode:401,headers:CORS,body:JSON.stringify({error:'Clave incorrecta.'})}; const article=await store.get(`article:${q.slug}`,{type:'json'}); if(!article)return {statusCode:404,headers:CORS,body:JSON.stringify({error:'Noticia no encontrada.'})}; return {statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(article)}; }
    const index = (await store.get('index', { type: 'json' })) || [];
    index.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    if (event.queryStringParameters && event.queryStringParameters.stats === '1') {
      const withViews = await Promise.all(index.map(async a => ({ ...a, views: (await store.get(`views:${a.slug}`, { type: 'json' })) || 0 })));
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ total: index.length, articles: withViews }) };
    }
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(index) };
  }

  if (event.httpMethod === 'POST') {
    if (!auth(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Clave incorrecta.' }) };
    let data; try { data = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Datos inválidos.' }) }; }
    const { title, author, category, content, imageBase64, imageType, featured, videoUrl, audioUrl } = data;
    if (!title || !author || !category || !content) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan campos obligatorios.' }) };
    const index = (await store.get('index', { type: 'json' })) || [];
    const base = slugify(title); let slug = base, n = 2;
    while (index.some(a => a.slug === slug)) slug = `${base}-${n++}`;
    let hasImage = false;
    if (imageBase64 && imageType) { await store.set(`image:${slug}`, Buffer.from(imageBase64, 'base64'), { metadata: { contentType: imageType } }); hasImage = true; }
    const publishedAt = new Date().toISOString();
    const excerpt = content.replace(/\s+/g, ' ').trim().slice(0, 180);
    const article = { slug, title, author, category, content, hasImage, publishedAt, excerpt, featured: !!featured, videoUrl: videoUrl || '', audioUrl: audioUrl || '' };
    await store.setJSON(`article:${slug}`, article);
    index.push({ slug, title, author, category, publishedAt, excerpt, hasImage, featured: !!featured, videoUrl: videoUrl || '', audioUrl: audioUrl || '' });
    if (featured) index.forEach(a => { if (a.slug !== slug) a.featured = false; });
    await store.setJSON('index', index);
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) };
  }

  if (event.httpMethod === 'PUT') {
    if (!auth(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Clave incorrecta.' }) };
    const q = event.queryStringParameters || {}; const slug = q.slug;
    if (!slug) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Falta el slug.' }) };
    const index = (await store.get('index', { type: 'json' })) || []; const entry = index.find(a => a.slug === slug);
    if (!entry) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Noticia no encontrada.' }) };
    const article = await store.get(`article:${slug}`, { type: 'json' }); if (!article) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Noticia no encontrada.' }) };
    let data = {}; try { data = JSON.parse(event.body || '{}'); } catch {}
    if (data.title !== undefined) article.title=String(data.title).trim();
    if (data.author !== undefined) article.author=String(data.author).trim();
    if (data.category !== undefined) article.category=String(data.category).trim();
    if (data.content !== undefined) article.content=String(data.content).trim();
    if (data.videoUrl !== undefined) article.videoUrl=String(data.videoUrl||'').trim();
    if (data.audioUrl !== undefined) article.audioUrl=String(data.audioUrl||'').trim();
    if (data.featured === true) { index.forEach(a => a.featured = a.slug === slug); article.featured = true; }
    if (data.featured === false) { entry.featured = false; article.featured = false; }
    if (data.removeImage === true && article.hasImage) { await store.delete(`image:${slug}`); article.hasImage=false; }
    if (data.imageBase64 && data.imageType) { await store.set(`image:${slug}`, Buffer.from(data.imageBase64,'base64'), {metadata:{contentType:data.imageType}}); article.hasImage=true; }
    article.excerpt=article.content.replace(/\s+/g,' ').trim().slice(0,180);
    article.editedAt=new Date().toISOString();
    Object.assign(entry,{title:article.title,author:article.author,category:article.category,excerpt:article.excerpt,featured:!!article.featured,hasImage:!!article.hasImage,videoUrl:article.videoUrl||'',audioUrl:article.audioUrl||''});
    await store.setJSON(`article:${slug}`, article); await store.setJSON('index', index);
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, article }) };
  }

  if (event.httpMethod === 'DELETE') {
    if (!auth(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Clave incorrecta.' }) };
    const slug = event.queryStringParameters && event.queryStringParameters.slug;
    if (!slug) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Falta indicar qué noticia eliminar.' }) };
    const index = (await store.get('index', { type: 'json' })) || []; const entry = index.find(a => a.slug === slug);
    if (!entry) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Esa noticia ya no existe.' }) };
    await store.delete(`article:${slug}`); if (entry.hasImage) await store.delete(`image:${slug}`); await store.delete(`views:${slug}`);
    await store.setJSON('index', index.filter(a => a.slug !== slug));
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted: slug }) };
  }
  return { statusCode: 405, headers: CORS, body: 'Método no permitido' };
};
