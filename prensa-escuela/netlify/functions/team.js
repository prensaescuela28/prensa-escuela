const { getStore } = require('@netlify/blobs');
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, x-press-password','Access-Control-Allow-Methods':'GET, PUT, OPTIONS'};
const store=()=>getStore({name:'articles',siteID:process.env.SITE_ID,token:process.env.BLOBS_TOKEN,consistency:'strong'});
const auth=e=>(e.headers['x-press-password']||e.headers['X-Press-Password'])===process.env.PRESS_PASSWORD&&!!process.env.PRESS_PASSWORD;
const DEFAULT={intro:'Prensa Normalista es un medio escolar construido con participación de la comunidad educativa.',coordinator:{name:'',role:'Docente coordinador',bio:'',hasPhoto:false},reporters:[],collaborators:[],hasGroupPhoto:false};
function json(statusCode,body){return{statusCode,headers:{...CORS,'Content-Type':'application/json'},body:JSON.stringify(body)}}
exports.handler=async e=>{
 const s=store(); if(e.httpMethod==='OPTIONS')return{statusCode:200,headers:CORS,body:''};
 if(e.httpMethod==='GET'){
   const t=(await s.get('team',{type:'json'}))||DEFAULT;
   return json(200,t);
 }
 if(e.httpMethod!=='PUT')return{statusCode:405,headers:CORS,body:'Método no permitido'};
 if(!auth(e))return json(401,{error:'No autorizado.'});
 let d;try{d=JSON.parse(e.body||'{}')}catch{return json(400,{error:'Datos inválidos.'})}
 const current=(await s.get('team',{type:'json'}))||DEFAULT;
 const clean={
   intro:String(d.intro||'').trim(),
   coordinator:{
     name:String(d.coordinator?.name||'').trim(),
     role:'Docente coordinador',
     bio:String(d.coordinator?.bio||'').trim(),
     hasPhoto:!!current.coordinator?.hasPhoto
   },
   reporters:Array.isArray(d.reporters)?d.reporters.map(x=>({name:String(x.name||'').trim(),grade:String(x.grade||'').trim()})).filter(x=>x.name):[],
   collaborators:Array.isArray(d.collaborators)?d.collaborators.map(x=>({name:String(x.name||'').trim(),role:String(x.role||'').trim()})).filter(x=>x.name):[],
   hasGroupPhoto:!!current.hasGroupPhoto
 };
 if(d.coordinatorPhotoBase64&&d.coordinatorPhotoType){
   await s.set('team:coordinator-image',Buffer.from(d.coordinatorPhotoBase64,'base64'),{metadata:{contentType:d.coordinatorPhotoType}});
   clean.coordinator.hasPhoto=true;
 } else if(d.removeCoordinatorPhoto){await s.delete('team:coordinator-image');clean.coordinator.hasPhoto=false;}
 if(d.groupPhotoBase64&&d.groupPhotoType){
   await s.set('team:group-image',Buffer.from(d.groupPhotoBase64,'base64'),{metadata:{contentType:d.groupPhotoType}});
   clean.hasGroupPhoto=true;
 } else if(d.removeGroupPhoto){await s.delete('team:group-image');clean.hasGroupPhoto=false;}
 await s.setJSON('team',clean);
 return json(200,{ok:true,team:clean});
};
