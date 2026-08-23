const {getStore}=require('@netlify/blobs');
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function attr(s){return esc(s).replace(/\n/g,' ')}
function videoEmbed(u){const m=String(u||'').match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);return m?`https://www.youtube.com/embed/${m[1]}`:''}
exports.handler=async event=>{
  const id=event.queryStringParameters?.id||'';
  const store=getStore({name:'articles',siteID:process.env.SITE_ID,token:process.env.BLOBS_TOKEN,consistency:'strong'});
  const notFound=()=>({statusCode:404,headers:{'Content-Type':'text/html; charset=utf-8'},body:'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historia no encontrada</title><link rel="stylesheet" href="/styles.css"></head><body><main class="article-page"><h1 class="article-title">Esta historia territorial no existe o fue retirada.</h1><a class="back-link" href="/territorio.html">← Volver a Identidad territorial</a></main></body></html>'});
  if(!id)return notFound();
  const item=await store.get(`territory:${id}`,{type:'json'}); if(!item)return notFound();
  const siteUrl=process.env.URL||`https://${event.headers.host}`;
  const image=item.hasImage?`${siteUrl}/api/territory-media?id=${encodeURIComponent(id)}`:null;
  const paragraphs=String(item.content||'').split(/\n{2,}/).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('');
  const date=item.createdAt?new Date(item.createdAt).toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'}):'';
  const video=item.videoUrl&&videoEmbed(item.videoUrl)?`<div class="media-box"><h3>🎥 Video</h3><div class="video-wrap"><iframe src="${videoEmbed(item.videoUrl)}" title="Video relacionado" loading="lazy" allowfullscreen></iframe></div></div>`:'';
  const audio=item.audioUrl&&/^https?:\/\//i.test(item.audioUrl)?`<div class="media-box"><h3>🎙️ Audio / podcast</h3><audio controls preload="none" src="${attr(item.audioUrl)}"></audio></div>`:'';
  const url=`${siteUrl}/territorio/${encodeURIComponent(id)}`;
  const share=`<div class="share-box"><strong>Comparte esta historia</strong><div class="share-actions"><a class="share-btn share-whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(item.title+' — '+url)}">WhatsApp</a><button class="share-btn" onclick="navigator.clipboard.writeText(location.href).then(()=>this.textContent='¡Enlace copiado!')">Copiar enlace</button></div></div>`;
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${attr(item.title)} — Identidad territorial</title><meta name="description" content="${attr(String(item.content||'').slice(0,160))}"><meta property="og:type" content="article"><meta property="og:title" content="${attr(item.title)}"><meta property="og:url" content="${attr(url)}">${image?`<meta property="og:image" content="${attr(image)}">`:''}<link rel="icon" href="/escudo.png"><link rel="stylesheet" href="/styles.css"></head><body><header class="masthead"><a href="/" class="masthead-link"><img class="masthead-crest" src="/escudo.png" alt="Escudo"><div class="masthead-edition">MEMORIA Y TERRITORIO</div><h1 class="masthead-title">Identidad territorial</h1><div class="masthead-rule"></div></a></header><main class="article-page"><span class="tag">${esc(item.category||'Historia local')}</span><h1 class="article-title">${esc(item.title)}</h1><p class="article-byline">📍 ${esc(item.place||'')} · Por ${esc(item.author||'Prensa Normalista')}${date?' · '+date:''}</p>${image?`<img class="article-image" src="${attr(image)}" alt="${attr(item.title)}">`:''}<div class="article-body">${paragraphs}</div>${video}${audio}${share}<a class="back-link" href="/territorio.html">← Volver a Identidad territorial</a></main></body></html>`;
  return {statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=0,must-revalidate'},body:html};
};
