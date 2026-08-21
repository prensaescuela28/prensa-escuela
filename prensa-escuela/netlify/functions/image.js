const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const slug = event.queryStringParameters && event.queryStringParameters.slug;
  if (!slug) {
    return { statusCode: 400, body: 'Falta el parámetro slug.' };
  }

  const store = getStore({
    name: 'articles',
    siteID: process.env.SITE_ID,
    token: process.env.BLOBS_TOKEN,
  });
  const result = await store.getWithMetadata(`image:${slug}`, { type: 'arrayBuffer' });

  if (!result) {
    return { statusCode: 404, body: 'Imagen no encontrada.' };
  }

  const buffer = Buffer.from(result.data);
  const contentType = (result.metadata && result.metadata.contentType) || 'image/jpeg';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: buffer.toString('base64'),
    isBase64Encoded: true,
  };
};
