const { getStore } = require('@netlify/blobs');

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'nota';
}

function getArticlesStore() {
  return getStore({
    name: 'articles',
    siteID: process.env.SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-press-password',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event) => {
  const store = getArticlesStore();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // --- Listar noticias publicadas ---
  if (event.httpMethod === 'GET') {
    const index = (await store.get('index', { type: 'json' })) || [];
    index.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(index),
    };
  }

  // --- Publicar una noticia nueva ---
  if (event.httpMethod === 'POST') {
    const sentPassword = event.headers['x-press-password'] || event.headers['X-Press-Password'];
    const realPassword = process.env.PRESS_PASSWORD;

    if (!realPassword) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'El sitio no tiene configurada la clave del equipo de prensa (PRESS_PASSWORD).' }),
      };
    }
    if (sentPassword !== realPassword) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Clave incorrecta.' }) };
    }

    let data;
    try {
      data = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Datos inválidos.' }) };
    }

    const { title, author, category, content, imageBase64, imageType } = data;
    if (!title || !author || !category || !content) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan campos obligatorios.' }) };
    }

    const index = (await store.get('index', { type: 'json' })) || [];
    const base = slugify(title);
    let slug = base;
    let n = 2;
    while (index.some((a) => a.slug === slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }

    let hasImage = false;
    if (imageBase64 && imageType) {
      const buffer = Buffer.from(imageBase64, 'base64');
      await store.set(`image:${slug}`, buffer, { metadata: { contentType: imageType } });
      hasImage = true;
    }

    const publishedAt = new Date().toISOString();
    const excerpt = content.replace(/\s+/g, ' ').trim().slice(0, 180);
    const article = { slug, title, author, category, content, hasImage, publishedAt, excerpt };

    await store.setJSON(`article:${slug}`, article);
    index.push({ slug, title, author, category, publishedAt, excerpt, hasImage });
    await store.setJSON('index', index);

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    };
  }

  return { statusCode: 405, headers: CORS, body: 'Método no permitido' };
};
