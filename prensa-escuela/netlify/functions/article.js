const { getStore } = require('@netlify/blobs');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  // Netlify puede entregar el slug de dos formas según cómo se procese el redirect:
  // como query string (?slug=...) o conservando la ruta original (/noticia/...).
  // Aceptamos ambas para evitar que una noticia válida termine como "no encontrada".
  const querySlug = event.queryStringParameters && event.queryStringParameters.slug;
  const pathMatch = (event.path || '').match(/\/noticia\/([^/?#]+)/i);
  let slug = querySlug || (pathMatch && pathMatch[1]);
  try {
    slug = slug ? decodeURIComponent(slug) : '';
  } catch (e) {
    slug = '';
  }
  slug = String(slug || '').replace(/^\/+|\/+$/g, '');

  const siteUrl = process.env.URL || `https://${event.headers.host}`;

  const notFound = () => ({
    statusCode: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Noticia no encontrada — Prensa Escuela</title><link rel="stylesheet" href="/styles.css"></head><body><main class="article-page"><h1 class="article-title">Esta noticia no existe o fue retirada</h1><a class="back-link" href="/">← Volver a portada</a></main></body></html>`,
  });

  if (!slug) return notFound();

  const store = getStore({
    name: 'articles',
    siteID: process.env.SITE_ID,
    token: process.env.BLOBS_TOKEN,
    consistency: 'strong',
  });
  const article = await store.get(`article:${slug}`, { type: 'json' });
  if (!article) return notFound();

  const imageUrl = article.hasImage ? `${siteUrl}/api/image?slug=${slug}` : null;
  const paragraphs = article.content
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  const date = new Date(article.publishedAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tagClass = article.category === 'Columna de Opinión' ? 'tag--opinion' : 'tag--noticia';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)} — Prensa Escuela</title>
<meta name="description" content="${escapeHtml(article.excerpt)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.excerpt)}">
${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
<meta property="og:url" content="${siteUrl}/noticia/${slug}">
${!imageUrl ? `<meta property="og:image" content="${siteUrl}/escudo.png">` : ''}
<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
<link rel="icon" type="image/png" href="/escudo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="masthead">
  <a href="/" class="masthead-link">
    <img class="masthead-crest" src="/escudo.png" alt="Escudo de la Escuela Normal Superior de Manatí">
    <div class="masthead-edition">EDICIÓN DIGITAL · ${date}</div>
    <h1 class="masthead-title">Prensa Escuela</h1>
    <div class="masthead-rule"></div>
  </a>
</header>
<main class="article-page">
  <span class="tag ${tagClass}">${escapeHtml(article.category)}</span>
  <h1 class="article-title">${escapeHtml(article.title)}</h1>
  <p class="article-byline">Por ${escapeHtml(article.author)} · ${date}</p>
  ${imageUrl ? `<img class="article-image" src="${imageUrl}" alt="${escapeHtml(article.title)}">` : ''}
  <div class="article-body">${paragraphs}</div>
  <a class="back-link" href="/">← Volver a portada</a>
</main>
</body>
</html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
