const { getStore } = require('@netlify/blobs');

function getStoreSafe() {
  return getStore(
    process.env.SITE_ID && process.env.BLOBS_TOKEN
      ? { name: 'articles', siteID: process.env.SITE_ID, token: process.env.BLOBS_TOKEN, consistency: 'strong' }
      : { name: 'articles', consistency: 'strong' }
  );
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
}

function attr(value) {
  return esc(value).replace(/[\r\n]+/g, ' ');
}

function getId(event) {
  const queryId = event.queryStringParameters?.id;
  if (queryId) return decodeURIComponent(String(queryId).trim());

  const path = String(event.path || '');
  const match = path.match(/\/territorio\/([^/?#]+)/i);
  if (match) return decodeURIComponent(match[1]);

  return '';
}

function videoEmbed(url) {
  const value = String(url || '');
  const match = value.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

function notFound() {
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historia no encontrada — Prensa Normalista</title><link rel="icon" href="/escudo.png"><link rel="stylesheet" href="/styles.css"></head><body><header class="masthead"><a href="/" class="masthead-link"><img class="masthead-crest" src="/escudo.png" alt="Escudo"><div class="masthead-edition">MEMORIA Y TERRITORIO</div><h1 class="masthead-title">Identidad territorial</h1><div class="masthead-rule"></div></a></header><main class="article-page"><h1 class="article-title">Esta historia territorial no existe o fue retirada.</h1><p class="article-byline">Es posible que el enlace sea antiguo o que la historia haya sido eliminada.</p><a class="back-link" href="/territorio.html">← Volver a Identidad territorial</a></main></body></html>`;
  return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body };
}

exports.handler = async event => {
  const id = getId(event);
  if (!id) return notFound();

  try {
    const store = getStoreSafe();
    const item = await store.get(`territory:${id}`, { type: 'json' });
    if (!item) return notFound();

    const siteUrl = String(process.env.URL || `https://${event.headers?.host || 'prensa-normalista.netlify.app'}`).replace(/\/$/, '');
    const url = `${siteUrl}/territorio/${encodeURIComponent(id)}`;
    const image = item.hasImage ? `${siteUrl}/api/territory-media?id=${encodeURIComponent(id)}` : `${siteUrl}/escudo.png`;
    const description = String(item.content || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const paragraphs = String(item.content || '')
      .split(/\n{2,}/)
      .filter(Boolean)
      .map(text => `<p>${esc(text).replace(/\n/g, '<br>')}</p>`)
      .join('');
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    const videoUrl = videoEmbed(item.videoUrl);
    const video = videoUrl
      ? `<div class="media-box"><h3>🎥 Video</h3><div class="video-wrap"><iframe src="${attr(videoUrl)}" title="Video relacionado" loading="lazy" allowfullscreen></iframe></div></div>`
      : '';
    const audio = item.audioUrl && /^https?:\/\//i.test(item.audioUrl)
      ? `<div class="media-box"><h3>🎙️ Audio / podcast</h3><audio controls preload="none" src="${attr(item.audioUrl)}"></audio></div>`
      : '';
    const share = `<div class="share-box"><strong>Comparte esta historia</strong><div class="share-actions"><a class="share-btn share-whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(item.title + ' — ' + url)}">WhatsApp</a><button class="share-btn" type="button" onclick="navigator.clipboard.writeText(location.href).then(()=>this.textContent='¡Enlace copiado!')">Copiar enlace</button></div></div>`;

    const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${attr(item.title)} — Identidad territorial</title><meta name="description" content="${attr(description)}"><meta name="robots" content="index,follow"><meta property="og:type" content="article"><meta property="og:site_name" content="Prensa Normalista"><meta property="og:title" content="${attr(item.title)}"><meta property="og:description" content="${attr(description)}"><meta property="og:url" content="${attr(url)}"><meta property="og:image" content="${attr(image)}"><meta property="og:image:alt" content="${attr(item.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(item.title)}"><meta name="twitter:description" content="${attr(description)}"><meta name="twitter:image" content="${attr(image)}"><link rel="canonical" href="${attr(url)}"><link rel="icon" href="/escudo.png"><link rel="stylesheet" href="/styles.css"></head><body><header class="masthead"><a href="/" class="masthead-link"><img class="masthead-crest" src="/escudo.png" alt="Escudo"><div class="masthead-edition">MEMORIA Y TERRITORIO</div><h1 class="masthead-title">Identidad territorial</h1><div class="masthead-rule"></div></a><nav class="main-nav"><a href="/">Inicio</a><a href="/laboratorio.html">Laboratorio</a><a href="/territorio.html">Territorio</a><a href="/encuestas.html">Encuestas</a><a href="/voces.html">Muchas voces</a><a class="radio-nav-link" href="/radio.html"><span class="radio-dot"></span> Radio en vivo</a></nav></header><main class="article-page"><span class="tag">${esc(item.category || 'Historia local')}</span><h1 class="article-title">${esc(item.title)}</h1><p class="article-byline">📍 ${esc(item.place || '')} · Por ${esc(item.author || 'Prensa Normalista')}${date ? ' · ' + date : ''}</p>${item.hasImage ? `<img class="article-image" src="${attr(image)}" alt="${attr(item.title)}">` : ''}<div class="article-body">${paragraphs}</div>${video}${audio}${share}<a class="back-link" href="/territorio.html">← Volver a Identidad territorial</a></main></body></html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Robots-Tag': 'index, follow'
      },
      body
    };
  } catch (error) {
    console.error('territory-article error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      body: '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Error — Prensa Normalista</title><link rel="stylesheet" href="/styles.css"></head><body><main class="article-page"><h1 class="article-title">No pudimos cargar esta historia.</h1><p class="article-byline">Intenta nuevamente en unos segundos.</p><a class="back-link" href="/territorio.html">← Volver a Identidad territorial</a></main></body></html>'
    };
  }
};
