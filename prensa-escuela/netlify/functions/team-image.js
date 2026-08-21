const { getStore } = require('@netlify/blobs');
exports.handler=async event=>{
 const kind=event.queryStringParameters&&event.queryStringParameters.kind;
 if(!['coordinator','group'].includes(kind))return{statusCode:400,body:'Tipo de imagen inválido.'};
 const s=getStore({name:'articles',siteID:process.env.SITE_ID,token:process.env.BLOBS_TOKEN,consistency:'strong'});
 const r=await s.getWithMetadata(`team:${kind}-image`,{type:'arrayBuffer'});
 if(!r)return{statusCode:404,body:'Imagen no encontrada.'};
 return{statusCode:200,headers:{'Content-Type':(r.metadata&&r.metadata.contentType)||'image/jpeg','Cache-Control':'public, max-age=3600'},body:Buffer.from(r.data).toString('base64'),isBase64Encoded:true};
};
