const { getStore } = require('@netlify/blobs');
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, x-press-password', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
const store = () => getStore({ name: 'articles', siteID: process.env.SITE_ID, token: process.env.BLOBS_TOKEN, consistency: 'strong' });
const auth = e => (e.headers['x-press-password'] || e.headers['X-Press-Password']) === process.env.PRESS_PASSWORD && !!process.env.PRESS_PASSWORD;
function slugify(t) { return t.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,70)||'voz'; }
exports.handler = async event => {
  const s = store(); if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:CORS, body:'' };
  if (event.httpMethod === 'POST') {
    let d; try { d=JSON.parse(event.body||'{}'); } catch { return {statusCode:400,headers:CORS,body:JSON.stringify({error:'Datos inválidos.'})}; }
    if (!d.title || !d.author || !d.grade || !d.type || !d.content) return {statusCode:400,headers:CORS,body:JSON.stringify({error:'Completa todos los campos obligatorios.'})};
    if (d.content.length < 80) return {statusCode:400,headers:CORS,body:JSON.stringify({error:'El texto debe tener al menos 80 caracteres.'})};
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const item = { id, title:d.title.trim(), author:d.author.trim(), grade:d.grade.trim(), type:d.type.trim(), content:d.content.trim(), submittedAt:new Date().toISOString(), status:'pending' };
    await s.setJSON(`voice:${id}`, item); const pending=(await s.get('voices-index',{type:'json'}))||[]; pending.unshift({id,title:item.title,author:item.author,grade:item.grade,type:item.type,submittedAt:item.submittedAt,status:'pending'}); await s.setJSON('voices-index',pending);
    return {statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify({ok:true})};
  }
  if (event.httpMethod === 'GET') {
    if (!auth(event)) return {statusCode:401,headers:CORS,body:JSON.stringify({error:'No autorizado.'})};
    const list=(await s.get('voices-index',{type:'json'}))||[]; return {statusCode:200,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(list)};
  }
  if (event.httpMethod === 'DELETE') {
    if (!auth(event)) return {statusCode:401,headers:CORS,body:JSON.stringify({error:'No autorizado.'})};
    const id=event.queryStringParameters&&event.queryStringParameters.id; if(!id)return {statusCode:400,headers:CORS,body:JSON.stringify({error:'Falta el identificador.'})};
    await s.delete(`voice:${id}`); const list=(await s.get('voices-index',{type:'json'}))||[]; await s.setJSON('voices-index',list.filter(x=>x.id!==id)); return {statusCode:200,headers:CORS,body:JSON.stringify({ok:true})};
  }
  return {statusCode:405,headers:CORS,body:'Método no permitido'};
};
