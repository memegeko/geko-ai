import {identity,db,listRecords,saveRecord,getConfig,allCharacters,isAdmin,apiError,connectionPublic} from '../../../lib/server';
import {validateRecord} from '../../../lib/validation';
import {characters} from '../../../lib/characters';
export async function GET(){try{
 const u=await identity();
 await db().prepare("INSERT OR IGNORE INTO config(id,value) VALUES('owner',?)").bind(JSON.stringify(u.userId)).run();
 const items=await listRecords(u.userId),c=await getConfig('connection');
 return Response.json({user:{id:u.userId,name:u.fullName||u.email.split('@')[0],email:u.email},admin:await isAdmin(u.userId),characters:await allCharacters(u.userId),items,connection:connectionPublic(c)},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return apiError(e);}}
export async function PUT(req:Request){try{
 const u=await identity(),body=await req.json() as any;
 if(JSON.stringify(body).length>1500000)throw new Error('Record is too large.');
 const kind=body.kind,data=validateRecord(kind,body.data);
 if(kind==='profile'&&data.id!==`profile:${u.userId}`)throw new Error('FORBIDDEN');
 if(kind==='character'){
  if(characters.some(c=>c.id===data.id))throw new Error('Starter characters cannot be overwritten.');
  data.owner=u.userId;
 }
 await saveRecord(data.id,u.userId,kind,data);return Response.json({ok:true});
}catch(e){return apiError(e);}}
export async function DELETE(req:Request){try{
 const u=await identity(),{id}=await req.json() as any;
 if(typeof id!=='string'||id.length>180)throw new Error('Invalid record ID.');
 await db().prepare('DELETE FROM records WHERE id = ? AND owner = ?').bind(id,u.userId).run();
 return Response.json({ok:true});
}catch(e){return apiError(e);}}
