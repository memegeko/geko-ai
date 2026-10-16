import {db,getRecord} from './server';
import type {Chat,Message,Character} from './types';
export function groupError(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export async function room(id:string,userId:string){
 const row=await db().prepare('SELECT * FROM group_rooms WHERE id = ? AND (owner = ? OR guest = ?)').bind(id,userId,userId).first<any>();
 if(!row)groupError('This group is unavailable or you are not a member.',404);
 return row;
}
export function locked(r:any){return !!r.generation&&r.generation_until>new Date().toISOString();}
export async function roomMessages(id:string):Promise<Message[]>{const rows=await db().prepare('SELECT data FROM group_messages WHERE group_id = ? ORDER BY created,id').bind(id).all<any>();return rows.results.map((r:any)=>JSON.parse(r.data));}
export async function publicRoom(r:any,userId:string):Promise<Chat>{
 const ownPersona=r.owner_persona?JSON.parse(r.owner_persona):null,guestPersona=r.guest_persona?JSON.parse(r.guest_persona):null;
 const members=[{id:r.owner,name:r.owner_name,...(ownPersona?{persona:{name:ownPersona.name,description:ownPersona.description}}:{})},...(r.guest?[{id:r.guest,name:r.guest_name,...(guestPersona?{persona:{name:guestPersona.name,description:guestPersona.description}}:{})}]:[])];
 return {id:r.id,title:r.title,characters:JSON.parse(r.characters),characterSnapshots:JSON.parse(r.snapshots),messages:(await roomMessages(r.id)).map(m=>m.pending&&(!locked(r)||r.generation!==m.id)?{...m,pending:false}:m).filter(m=>m.content||m.pending),updated:r.updated,isGroup:true,ownerId:r.owner,members,personaId:(userId===r.owner?ownPersona:guestPersona)?.id,inviteToken:r.owner===userId?r.invite:undefined,generating:locked(r)};
}
export async function listGroups(userId:string){const rows=await db().prepare('SELECT * FROM group_rooms WHERE owner = ? OR guest = ? ORDER BY updated DESC').bind(userId,userId).all<any>();return Promise.all(rows.results.map((r:any)=>publicRoom(r,userId)));}
export async function displayName(user:any){const profile=await getRecord(`profile:${user.userId}`,user.userId,'profile');return String(profile?.name||user.fullName||user.email.split('@')[0]).slice(0,60);}
export async function addGroupMessage(groupId:string,author:string,m:Message){await db().prepare('INSERT INTO group_messages(id,group_id,author,data,created) VALUES(?,?,?,?,?)').bind(m.id,groupId,author,JSON.stringify(m),m.created).run();await touch(groupId);}
export async function touch(id:string){await db().prepare('UPDATE group_rooms SET updated = ? WHERE id = ?').bind(new Date().toISOString(),id).run();}
export async function memberPersona(r:any,userId:string){const json=userId===r.owner?r.owner_persona:r.guest_persona;return json?JSON.parse(json):null;}
export async function updateGroupMessage(groupId:string,m:Message){await db().prepare('UPDATE group_messages SET data = ? WHERE id = ? AND group_id = ?').bind(JSON.stringify(m),m.id,groupId).run();await touch(groupId);}
export async function acquireGeneration(r:any,userId:string,messageId:string){
 const now=new Date().toISOString(),until=new Date(Date.now()+180000).toISOString();
 const claimed=await db().prepare('UPDATE group_rooms SET generation=?,generation_user=?,generation_until=? WHERE id=? AND (generation IS NULL OR generation_until < ?) RETURNING id').bind(messageId,userId,until,r.id,now).first<any>();
 if(!claimed)groupError('An AI is already replying in this group. Wait for it to finish.',409);
}
export async function releaseGeneration(id:string,messageId:string){await db().prepare('UPDATE group_rooms SET generation=NULL,generation_user=NULL,generation_until=NULL WHERE id=? AND generation=?').bind(id,messageId).run();}
