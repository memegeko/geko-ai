import {identity,db,getConfig,ollamaFetch,apiError} from '../../../../lib/server';
import {room,publicRoom,roomMessages,acquireGeneration,releaseGeneration,groupError} from '../../../../lib/groups';
import {buildPrompt} from '../../../../lib/prompt';
import {readOllamaReply} from '../../../../lib/reply-stream';
import type {Message,Character} from '../../../../lib/types';
export async function POST(req:Request){
 let groupId='',generationId='';
 try{
  const u=await identity(),b=await req.json() as any;
  const r=await room(String(b.groupId||''),u.userId);groupId=r.id;
  const character=(JSON.parse(r.snapshots) as Character[]).find(c=>c.id===b.characterId);
  if(!character)groupError('That AI is not in this group.');
  const c=await getConfig('connection');if(!c?.url||!c?.model)groupError('Ollama isn’t connected yet. Your group messages are saved.',503);
  const history=await roomMessages(r.id),previous=history.at(-1);
  if(b.regenerate&&(!previous||previous.role!=='assistant'||previous.speaker!==character.id||previous.id!==b.expectedLastId))groupError('The group has new messages. Refresh before regenerating.',409);
  req.signal.throwIfAborted();generationId=crypto.randomUUID();await acquireGeneration(r,u.userId,generationId);
  const chat=await publicRoom(r,u.userId);if(b.regenerate)chat.messages=history.slice(0,-1);
  const messages=buildPrompt(character,chat);
  messages[0].content+='\n\nHuman participants in this shared conversation:\n'+chat.members!.map(m=>`${m.name}${m.persona?` plays ${m.persona.name}: ${m.persona.description}`:''}`).join('\n')+'\nOnly shared room history and explicitly shared personas are available. Do not invent private memories.';
  const upstream=await ollamaFetch(c,'/api/chat',{model:c.model,messages,stream:true,options:{temperature:c.temperature,num_ctx:c.context,repeat_penalty:1.12}});
  if(!upstream.ok||!upstream.body)groupError(`Ollama returned HTTP ${upstream.status}. Check the gateway and model.`);
  const current=await room(r.id,u.userId);if(current.generation!==generationId||req.signal.aborted){await upstream.body.cancel();groupError('Generation stopped.',409);}
  const original=b.regenerate?previous:undefined;
  const pending:Message={id:generationId,role:'assistant',speaker:character.id,name:character.name,content:'',created:original?.created||new Date().toISOString(),pending:true,generationBy:u.userId,...(original?{variants:original.variants||[original.content],variant:original.variant||0}:{})};
  const operations=[];
  if(original)operations.push(db().prepare('DELETE FROM group_messages WHERE id=? AND group_id=?').bind(original.id,r.id));
  operations.push(db().prepare('INSERT INTO group_messages(id,group_id,author,data,created) VALUES(?,?,?,?,?)').bind(generationId,r.id,u.userId,JSON.stringify(pending),pending.created));
  await db().batch(operations);
  const messageId=generationId,abort=new AbortController(),encoder=new TextEncoder();let cancelled=false;
  const response=new ReadableStream<Uint8Array>({
   async start(controller){
    let content='',lastWrite=0,writes=Promise.resolve();
    async function persist(final:boolean){
     const msg:Message={...pending,content,pending:!final};
     if(final&&original){msg.variants=[...(original.variants||[original.content]),content];msg.variant=msg.variants.length-1;}
     if(final&&!content.trim()){
      const fallback=original?{...original,id:messageId,pending:false}:null;
      if(fallback)await db().prepare('UPDATE group_messages SET data=? WHERE id=? AND EXISTS(SELECT 1 FROM group_rooms WHERE id=? AND generation=?)').bind(JSON.stringify(fallback),messageId,r.id,messageId).run();
      else await db().prepare('DELETE FROM group_messages WHERE id=? AND EXISTS(SELECT 1 FROM group_rooms WHERE id=? AND generation=?)').bind(messageId,r.id,messageId).run();
     }else await db().prepare('UPDATE group_messages SET data=? WHERE id=? AND group_id=? AND EXISTS(SELECT 1 FROM group_rooms WHERE id=? AND generation=?)').bind(JSON.stringify(msg),messageId,r.id,r.id,messageId).run();
     await db().prepare('UPDATE group_rooms SET updated=? WHERE id=? AND generation=?').bind(new Date().toISOString(),r.id,messageId).run();
    }
    try{
     await readOllamaReply(upstream.body!,delta=>{
      content+=delta;
      if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify({message:{content:delta}})+'\n'));
      if(Date.now()-lastWrite>400){lastWrite=Date.now();writes=writes.then(()=>persist(false));}
     },abort.signal);
     if(!content.trim())throw new Error('The model returned an empty reply.');
    }catch(e:any){if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify({error:e.message||'Generation interrupted'})+'\n'));}
    finally{
     try{await writes;await persist(true);await releaseGeneration(r.id,messageId);}catch{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify({error:'The reply could not be saved. Refresh the group before retrying.'})+'\n'));}
     if(!cancelled){controller.enqueue(encoder.encode('{"done":true}\n'));controller.close();}
    }
   },
   cancel(){cancelled=true;abort.abort();}
  });
  return new Response(response,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no','X-Group-Message-Id':messageId}});
 }catch(e){if(groupId&&generationId)await releaseGeneration(groupId,generationId);return apiError(e);}
}
