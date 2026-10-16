import {identity,db,allCharacters,getRecord,apiError} from '../../../lib/server';
import {room,publicRoom,listGroups,displayName,locked,groupError,addGroupMessage,touch,memberPersona,updateGroupMessage,releaseGeneration} from '../../../lib/groups';
import type {Message} from '../../../lib/types';
export async function GET(req:Request){try{const u=await identity();const id=new URL(req.url).searchParams.get('id');return Response.json(id?{chat:await publicRoom(await room(id,u.userId),u.userId)}:{groups:await listGroups(u.userId)},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return apiError(e);}}
export async function POST(req:Request){try{
 const u=await identity(),b=await req.json() as any,action=b.action;
 if(action==='create'){
  if(!Array.isArray(b.characters)||b.characters.length<1||b.characters.length>2||new Set(b.characters).size!==b.characters.length)groupError('Choose one or two AI characters.');
  const available=await allCharacters(u.userId),chars=b.characters.map((id:string)=>available.find(c=>c.id===id));if(chars.some((c:any)=>!c))groupError('A selected character is unavailable.');
  const id=crypto.randomUUID(),invite=crypto.randomUUID()+crypto.randomUUID(),name=await displayName(u),created=new Date().toISOString();
  const title=String(b.title||chars.map((c:any)=>c.name).join(' & ')).trim().slice(0,100);
  await db().prepare('INSERT INTO group_rooms(id,owner,owner_name,title,characters,snapshots,invite,updated) VALUES(?,?,?,?,?,?,?,?)').bind(id,u.userId,name,title,JSON.stringify(b.characters),JSON.stringify(chars),invite,created).run();
  for(let i=0;i<chars.length;i++){const c=chars[i];await addGroupMessage(id,u.userId,{id:crypto.randomUUID(),role:'assistant',speaker:c.id,name:c.name,content:c.greeting,created:new Date(Date.now()+i).toISOString()});}
  return Response.json({chat:await publicRoom(await room(id,u.userId),u.userId)});
 }
 if(action==='join'){
  if(typeof b.token!=='string'||b.token.length>200)groupError('Invalid invitation.');
  const r=await db().prepare('SELECT * FROM group_rooms WHERE invite = ?').bind(b.token).first<any>();if(!r)groupError('This invitation was revoked or the group was deleted.',404);
  if(r.owner!==u.userId&&r.guest!==u.userId){
   const claimed=await db().prepare('UPDATE group_rooms SET guest=?,guest_name=?,guest_persona=NULL,updated=? WHERE id=? AND guest IS NULL RETURNING id').bind(u.userId,await displayName(u),new Date().toISOString(),r.id).first<any>();
   if(!claimed)groupError('This group is full. A group can have at most two people.',409);
  }
  return Response.json({chat:await publicRoom(await room(r.id,u.userId),u.userId)});
 }
 const r=await room(String(b.groupId||''),u.userId);
 if(action==='message'){
  if(typeof b.content!=='string'||!b.content.trim()||b.content.length>12000)groupError('Write a message of 1–12,000 characters.');
  const p=await memberPersona(r,u.userId);const m:Message={id:crypto.randomUUID(),role:'user',userId:u.userId,name:p?.name||await displayName(u),content:b.content.trim(),created:new Date().toISOString()};
  await addGroupMessage(r.id,u.userId,m);
 }else if(action==='persona'){
  const p=b.personaId?await getRecord(String(b.personaId),u.userId,'persona'):null;if(b.personaId&&!p)groupError('Persona not found.');
  const value=p?JSON.stringify({id:p.id,name:p.name,description:p.description}):null;
  const column=u.userId===r.owner?'owner_persona':'guest_persona';
  await db().prepare(`UPDATE group_rooms SET ${column}=? WHERE id=?`).bind(value,r.id).run();await touch(r.id);
 }else if(action==='rename'){
  if(r.owner!==u.userId)groupError('Only the group owner can rename the group.',403);if(typeof b.title!=='string'||!b.title.trim())groupError('Enter a group name.');
  await db().prepare('UPDATE group_rooms SET title=?,updated=? WHERE id=?').bind(b.title.trim().slice(0,100),new Date().toISOString(),r.id).run();
 }else if(action==='rotate-invite'){
  if(r.owner!==u.userId)groupError('FORBIDDEN',403);await db().prepare('UPDATE group_rooms SET invite=? WHERE id=?').bind(crypto.randomUUID()+crypto.randomUUID(),r.id).run();
 }else if(action==='leave'){
  if(r.owner===u.userId)groupError('The owner can delete the group instead of leaving.');if(locked(r))groupError('Wait for the current AI reply before leaving.',409);
  await db().prepare('UPDATE group_rooms SET guest=NULL,guest_name=NULL,guest_persona=NULL,invite=?,updated=? WHERE id=? AND guest=?').bind(crypto.randomUUID()+crypto.randomUUID(),new Date().toISOString(),r.id,u.userId).run();return Response.json({left:true});
 }else if(action==='delete'){
  if(r.owner!==u.userId)groupError('Only the group owner can delete the group.',403);if(locked(r))groupError('Stop the current AI reply before deleting the group.',409);
  await db().prepare('DELETE FROM group_rooms WHERE id=?').bind(r.id).run();await db().prepare('DELETE FROM group_messages WHERE group_id=?').bind(r.id).run();return Response.json({deleted:true});
 }else if(action==='stop'){
  const messageId=String(b.messageId||r.generation||'');const row=await db().prepare('SELECT data FROM group_messages WHERE id=? AND group_id=?').bind(messageId,r.id).first<any>();
  if(!row){if(r.generation){if(r.generation_user!==u.userId)groupError('Only the person who requested this reply can stop it.',403);await releaseGeneration(r.id,r.generation);}return Response.json({chat:await publicRoom(await room(r.id,u.userId),u.userId)});}
  const m=JSON.parse(row.data);if(m.generationBy!==u.userId)groupError('Only the person who requested this reply can stop it.',403);
  if(typeof b.visible!=='string'||b.visible.length>40000)groupError('Invalid visible reply.');
  const visible=b.visible;
  // Streaming can reach the requester before the next throttled database save.
  // The requester may keep that newer suffix, but cannot replace a saved prefix.
  if(!m.content.startsWith(visible)&&!visible.startsWith(m.content))groupError('The visible reply does not match the generated text.');
  await releaseGeneration(r.id,messageId);if(visible.trim())await updateGroupMessage(r.id,{...m,content:visible,pending:false,variants:m.variants?[...m.variants,visible]:undefined,variant:m.variants?m.variants.length:undefined});else if(m.variants?.length)await updateGroupMessage(r.id,{...m,content:m.variants[m.variant||0],pending:false});else await db().prepare('DELETE FROM group_messages WHERE id=? AND group_id=?').bind(messageId,r.id).run();
 }else if(action==='edit-message'||action==='truncate'){
  if(locked(r))groupError('Wait for the current AI reply before editing the shared history.',409);
  const row=await db().prepare('SELECT * FROM group_messages WHERE id=? AND group_id=?').bind(String(b.messageId||''),r.id).first<any>();if(!row)groupError('Message not found.',404);const m:Message=JSON.parse(row.data);
  if(action==='truncate'){
   if(r.owner!==u.userId)groupError('Only the owner can delete shared message history.',403);
   await db().prepare('DELETE FROM group_messages WHERE group_id=? AND (created>? OR (created=? AND id>=?))').bind(r.id,row.created,row.created,row.id).run();await touch(r.id);
  }else{
   const patch=b.patch||{};
   if('content' in patch||'variant' in patch){if(m.role==='user'&&m.userId!==u.userId)groupError('You can only edit your own messages.',403);}
   if('content' in patch){if(typeof patch.content!=='string'||!patch.content.trim()||patch.content.length>12000)groupError('Invalid message.');m.content=patch.content;m.variants=undefined;m.variant=undefined;}
   if('variant' in patch){if(!m.variants?.[patch.variant])groupError('Reply variant not found.');m.variant=patch.variant;m.content=m.variants[patch.variant];}
   if('pinned' in patch)m.pinned=!!patch.pinned;
   if('rating' in patch)m.rating=Math.min(4,Math.max(1,Number(patch.rating)||1));
   await updateGroupMessage(r.id,m);
  }
 }else groupError('Unknown group action.');
 return Response.json({chat:await publicRoom(await room(r.id,u.userId),u.userId)});
}catch(e){return apiError(e);}}
