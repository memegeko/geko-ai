import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const sqlite=new DatabaseSync(':memory:');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(await readFile('drizzle/'+file,'utf8'));
globalThis.__gekoUser={userId:'alice',email:'alice@example.test',fullName:'Alice',displayName:'Alice'};
globalThis.__gekoDB={async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}},prepare(sql){let params=[];return {bind(...p){params=p;return this;},async first(){return sqlite.prepare(sql).get(...params)||null;},async all(){return {results:sqlite.prepare(sql).all(...params)};},async run(){sqlite.prepare(sql).run(...params);return {success:true};}};}};
await mkdir('.sites-runtime/tests',{recursive:true});
const compiled=new Set();
await writeFile('.sites-runtime/tests/mock-env.mjs','export const env={DB:globalThis.__gekoDB};');
await writeFile('.sites-runtime/tests/mock-auth.mjs','export async function getChatGPTUser(){return globalThis.__gekoUser;}');
async function compile(source){const abs=path.resolve(source);const filename=path.relative(root,abs).replaceAll('/','_').replace(/\.tsx?$/,'.mjs');const target=path.join(root,'.sites-runtime/tests',filename);if(compiled.has(abs))return target;compiled.add(abs);let content=await readFile(abs,'utf8');const replacements=[];for(const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)){const spec=match[1];if(spec==='cloudflare:workers')replacements.push([spec,'./mock-env.mjs']);else if(spec.endsWith('chatgpt-auth'))replacements.push([spec,'./mock-auth.mjs']);else if(spec.startsWith('.')){const dep=await compile(path.resolve(path.dirname(abs),spec+'.ts'));replacements.push([spec,'./'+path.basename(dep)]);}}for(const [a,b] of replacements)content=content.replaceAll(`'${a}'`,`'${b}'`).replaceAll(`"${a}"`,`"${b}"`);const output=ts.transpileModule(content,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});await writeFile(target,output.outputText);return target;}
async function load(source){return import(await compile(source));}
const data=await load('app/api/data/route.ts','data');
const connection=await load('app/api/connection/route.ts','connection');
const generate=await load('app/api/generate/route.ts','generate');
const prompt=await load('lib/prompt.ts','prompt');
const groups=await load('app/api/groups/route.ts','groups');
const groupGenerate=await load('app/api/groups/generate/route.ts','group-generate');
const req=body=>new Request('https://geko.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const put=async(kind,record)=>data.PUT(req({kind,data:record}));
const alice=()=>{globalThis.__gekoUser={userId:'alice',email:'alice@example.test',fullName:'Alice',displayName:'Alice'};};
const bob=()=>{globalThis.__gekoUser={userId:'bob',email:'bob@example.test',fullName:'Bob',displayName:'Bob'};};
const character={id:'character-alice',name:'Test character',greeting:'Hello!',tagline:'Testing',description:'A test character',definition:'Stay curious',category:'Fantasy',tags:['Fantasy'],creator:'alice',avatar:0,visibility:'private'};
const chat={id:'chat-alice',title:'Private chat',characters:[character.id],messages:[{id:'greeting',role:'assistant',speaker:character.id,name:character.name,content:'Hello!',created:new Date().toISOString()},{id:'message',role:'user',content:'Tell me about the Moonwood',created:new Date().toISOString()}],updated:new Date().toISOString()};
test('core app operations and account isolation',async t=>{
 await t.test('unauthenticated API requests are rejected',async()=>{globalThis.__gekoUser=null;assert.equal((await data.GET()).status,401);assert.equal((await put('chat',chat)).status,401);alice();});
 await t.test('the owner receives seeded characters and admin access',async()=>{const d=await (await data.GET()).json();assert.equal(d.admin,true);assert.equal(d.characters.length,8);assert.equal(d.connection.configured,false);});
 await t.test('characters, personas, lorebooks, memories and chats persist',async()=>{assert.equal((await put('character',character)).status,200);assert.equal((await put('chat',chat)).status,200);for(const [kind,item] of [['persona',{id:'persona-alice',name:'Aster',description:'A traveler',avatar:0}],['lorebook',{id:'lore-alice',name:'My world',entries:[{id:'l1',name:'Moonwood',keywords:'moonwood',content:'A silver forest.',enabled:true,always:false}]}],['memory',{id:'memory-alice',characterId:character.id,content:'Alice’s private memory'}]])assert.equal((await put(kind,item)).status,200);const d=await (await data.GET()).json();assert.equal(d.items.length,5);});
 await t.test('a second user cannot read private records or overwrite them',async()=>{bob();const d=await (await data.GET()).json();assert.equal(d.admin,false);assert.equal(d.items.length,0);assert.equal(d.characters.some(c=>c.id===character.id),false);assert.equal((await put('chat',{...chat,title:'Stolen'})).status,403);assert.equal((await generate.POST(req({chatId:chat.id,characterId:character.id}))).status,400);await data.DELETE(req({id:chat.id}));alice();const own=await (await data.GET()).json();assert.equal(own.items.find(i=>i.id===chat.id).title,'Private chat');});
 await t.test('shared characters appear for friends without exposing chats',async()=>{await put('character',{...character,visibility:'shared'});bob();const d=await (await data.GET()).json();assert.equal(d.characters.some(c=>c.id===character.id),true);assert.equal(d.items.length,0);alice();});
 await t.test('generation remains explicitly unavailable until Ollama is configured',async()=>{const r=await generate.POST(req({chatId:chat.id,characterId:character.id}));assert.equal(r.status,503);assert.match((await r.json()).error,/isn’t connected/);});
 await t.test('only the owner can configure a reachable HTTPS Ollama gateway',async()=>{bob();assert.equal((await connection.POST(req({url:'https://ai.example.test',model:'test'}))).status,403);alice();assert.equal((await connection.POST(req({url:'http://192.168.2.1:11434',model:'test'}))).status,400);assert.equal((await connection.POST(req({url:'https://ai.example.test',model:'test',token:'server-secret'}))).status,200);const d=await (await data.GET()).json();assert.equal(d.connection.hasToken,true);assert.equal(d.connection.token,undefined);});
 await t.test('model testing and streaming chat forward through the server',async()=>{const originalFetch=globalThis.fetch;let forwarded;globalThis.fetch=async(url,init)=>{assert.equal(init.headers.Authorization,'Bearer server-secret');if(url.endsWith('/api/tags'))return Response.json({models:[{name:'test'}]});forwarded=JSON.parse(init.body);return new Response(JSON.stringify({message:{content:'A silver forest awaits.'},done:true})+'\n',{headers:{'Content-Type':'application/x-ndjson'}});};try{const models=await (await connection.POST(req({url:'https://ai.example.test',action:'test'}))).json();assert.deepEqual(models.models,['test']);const r=await generate.POST(req({chatId:chat.id,characterId:character.id}));assert.equal(r.status,200);assert.match(await r.text(),/silver forest/);assert.equal(forwarded.stream,true);assert.match(forwarded.messages[0].content,/Alice’s private memory/);assert.match(forwarded.messages[0].content,/A silver forest/);}finally{globalThis.fetch=originalFetch;}});
 await t.test('the server forwards the first token before Ollama completes',async()=>{
  const originalFetch=globalThis.fetch;let source;
  globalThis.fetch=async()=>new Response(new ReadableStream({start(c){source=c;}}));
  try{
   const response=await generate.POST(req({chatId:chat.id,characterId:character.id}));
   assert.equal(response.headers.get('X-Accel-Buffering'),'no');
   assert.match(response.headers.get('Cache-Control'),/no-transform/);
   const reader=response.body.getReader();
   source.enqueue(new TextEncoder().encode('{"message":{"content":"First"}}\n'));
   const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/First/);assert.equal(first.done,false);
   source.enqueue(new TextEncoder().encode('{"message":{"content":" second"},"done":true}\n'));source.close();
   const next=await reader.read();assert.match(new TextDecoder().decode(next.value),/second/);assert.equal((await reader.read()).done,true);
  }finally{globalThis.fetch=originalFetch;}
 });
 await t.test('lore keywords, disabled entries, persona and pinned context work',()=>{const result=prompt.buildPrompt(character,{...chat,messages:[...chat.messages,{id:'pin',role:'user',content:'An important promise',pinned:true}]},{id:'p',name:'Aster',description:'A traveler'},[{id:'l',name:'Lore',entries:[{id:'a',name:'Active',keywords:'moonwood',content:'MATCHED LORE',enabled:true,always:false},{id:'b',name:'Hidden',keywords:'moonwood',content:'DISABLED LORE',enabled:false,always:true},{id:'c',name:'Other',keywords:'unmentioned',content:'UNMATCHED LORE',enabled:true,always:false},{id:'d',name:'Rule',keywords:'',content:'ALWAYS LORE',enabled:true,always:true}]}]);assert.match(result[0].content,/Aster/);assert.match(result[0].content,/important promise/);assert.match(result[0].content,/MATCHED LORE/);assert.match(result[0].content,/ALWAYS LORE/);assert.doesNotMatch(result[0].content,/DISABLED LORE|UNMATCHED LORE/);});
 await t.test('saved snapshots preserve a conversation after deleting its character',async()=>{await put('chat',{...chat,characterSnapshots:[character]});await data.DELETE(req({id:character.id}));const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('{"message":{"content":"Still here"}}\n');try{assert.equal((await generate.POST(req({chatId:chat.id,characterId:character.id}))).status,200);}finally{globalThis.fetch=originalFetch;}});
 await t.test('records cannot change kind using an existing ID',async()=>{assert.equal((await put('memory',{id:chat.id,characterId:'elara',content:'Overwrite'})).status,403);});
});

test('shared groups enforce two people, two AIs, permissions, and shared generation',async t=>{
 alice();let group,token,guestMessageId;
 const action=async(action,body={})=>groups.POST(req({action,...body}));
 await t.test('the AI limit is checked on the server',async()=>{assert.equal((await action('create',{characters:['elara','kael','mika']})).status,400);assert.equal((await action('create',{characters:['elara','elara']})).status,400);assert.equal((await action('create',{characters:[]})).status,400);});
 await t.test('creating a room persists one human and two AI characters',async()=>{const r=await action('create',{characters:['elara','mika']});assert.equal(r.status,200);group=(await r.json()).chat;token=group.inviteToken;assert.equal(group.isGroup,true);assert.equal(group.members.length,1);assert.equal(group.characters.length,2);assert.equal(group.messages.length,2);});
 await t.test('nonmembers cannot read, write, or generate in a room',async()=>{bob();assert.equal((await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).status,404);assert.equal((await action('message',{groupId:group.id,content:'intrusion'})).status,404);assert.equal((await groupGenerate.POST(req({groupId:group.id,characterId:'elara'}))).status,404);assert.equal((await (await groups.GET(new Request('https://geko.test/api/groups'))).json()).groups.length,0);});
 await t.test('a friend joins with a valid invitation and cannot see the invite token',async()=>{const r=await action('join',{token});assert.equal(r.status,200);const joined=(await r.json()).chat;assert.equal(joined.members.length,2);assert.equal(joined.inviteToken,undefined);assert.equal((await action('join',{token})).status,200);});
 await t.test('a third person is refused even with the correct invitation',async()=>{globalThis.__gekoUser={userId:'charlie',email:'charlie@example.test',displayName:'Charlie',fullName:'Charlie'};assert.equal((await action('join',{token})).status,409);bob();});
 await t.test('human messages are appended and author identity cannot be forged',async()=>{const r=await action('message',{groupId:group.id,content:'Hi Alice!',userId:'alice',name:'Alice'});const c=(await r.json()).chat;const m=c.messages.find(m=>m.content==='Hi Alice!');assert.equal(m.userId,'bob');assert.equal(m.name,'Bob');guestMessageId=m.id;alice();await action('message',{groupId:group.id,content:'Hi Bob!'});const d=await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json();assert.ok(d.chat.messages.some(m=>m.content==='Hi Alice!'));assert.ok(d.chat.messages.some(m=>m.content==='Hi Bob!'));});
 await t.test('members cannot edit another human’s words or delete the room',async()=>{assert.equal((await action('edit-message',{groupId:group.id,messageId:guestMessageId,patch:{content:'Forged'}})).status,403);bob();assert.equal((await action('delete',{groupId:group.id})).status,403);assert.equal((await action('rename',{groupId:group.id,title:'Stolen room'})).status,403);assert.equal((await action('truncate',{groupId:group.id,messageId:guestMessageId})).status,403);});
 await t.test('private persona descriptions enter shared context only after explicit selection',async()=>{await put('persona',{id:'bob-persona',name:'Bram',description:'SHARED TRAVELER',avatar:0});await put('memory',{id:'bob-secret-memory',characterId:'elara',content:'BOB PRIVATE MEMORY'});await put('lorebook',{id:'bob-secret-lore',name:'Secret',entries:[{id:'secret',name:'Secret',always:true,enabled:true,keywords:'',content:'BOB PRIVATE LORE'}]});assert.equal((await action('persona',{groupId:group.id,personaId:'bob-persona'})).status,200);});
 await t.test('shared streaming is stored server-side and a second generation is locked out',async()=>{
  const originalFetch=globalThis.fetch;let source,forwarded;
  globalThis.fetch=async(url,init)=>{forwarded=JSON.parse(init.body);return new Response(new ReadableStream({start(c){source=c;}}));};
  try{
   const response=await groupGenerate.POST(req({groupId:group.id,characterId:'elara'}));assert.equal(response.status,200);assert.ok(response.headers.get('X-Group-Message-Id'));
   assert.match(forwarded.messages[0].content,/SHARED TRAVELER/);assert.doesNotMatch(forwarded.messages[0].content,/BOB PRIVATE MEMORY|BOB PRIVATE LORE|Alice’s private memory/);
   alice();assert.equal((await groupGenerate.POST(req({groupId:group.id,characterId:'mika'}))).status,409);
   source.enqueue(new TextEncoder().encode('{"message":{"content":"Welcome, both of you."}}\n'));source.close();const responseText=await response.text();assert.match(responseText,/Welcome/);
   const saved=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;
   assert.equal(saved.generating,false);assert.equal(saved.messages.at(-1).content,'Welcome, both of you.');assert.equal(saved.messages.at(-1).pending,false);
  }finally{globalThis.fetch=originalFetch;}
 });
 await t.test('regeneration keeps alternatives and rejects a stale last-message request',async()=>{
  bob();const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('{"message":{"content":"Another shared reply."}}\n');
  try{
   let c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;
   assert.equal((await groupGenerate.POST(req({groupId:group.id,characterId:'elara',regenerate:true,expectedLastId:'stale'}))).status,409);
   const r=await groupGenerate.POST(req({groupId:group.id,characterId:'elara',regenerate:true,expectedLastId:c.messages.at(-1).id}));assert.equal(r.status,200);await r.text();
   c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;assert.deepEqual(c.messages.at(-1).variants,['Welcome, both of you.','Another shared reply.']);
  }finally{globalThis.fetch=originalFetch;}
 });
 await t.test('Stop preserves only visible text and prevents a late generator overwrite',async()=>{
  const originalFetch=globalThis.fetch;let source;
  globalThis.fetch=async()=>new Response(new ReadableStream({start(c){source=c;}}));
  try{
   const r=await groupGenerate.POST(req({groupId:group.id,characterId:'mika'})),messageId=r.headers.get('X-Group-Message-Id'),reader=r.body.getReader();
   source.enqueue(new TextEncoder().encode('{"message":{"content":"Visible and an unseen tail"}}\n'));await reader.read();await new Promise(resolve=>setImmediate(resolve));
   const stopped=await action('stop',{groupId:group.id,messageId,visible:'Visible'});assert.equal(stopped.status,200);
   source.enqueue(new TextEncoder().encode('{"message":{"content":" LATE DATA"}}\n'));source.close();while(!(await reader.read()).done){}
   const c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;assert.equal(c.messages.find(m=>m.id===messageId).content,'Visible');
  }finally{globalThis.fetch=originalFetch;}
 });
 await t.test('stopping during model warm-up prevents a ghost reply after headers arrive',async()=>{
  const originalFetch=globalThis.fetch;let resolveFetch;
  globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve;});
  try{
   const pending=groupGenerate.POST(req({groupId:group.id,characterId:'mika'}));await new Promise(resolve=>setImmediate(resolve));
   const r=sqlite.prepare('SELECT generation FROM group_rooms WHERE id=?').get(group.id);assert.ok(r.generation);
   assert.equal((await action('stop',{groupId:group.id,visible:''})).status,200);
   resolveFetch(new Response('{"message":{"content":"GHOST REPLY"}}\n'));
   assert.equal((await pending).status,409);
   const c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;assert.equal(c.generating,false);assert.equal(c.messages.some(m=>m.content.includes('GHOST REPLY')),false);
  }finally{globalThis.fetch=originalFetch;}
 });
 await t.test('two concurrent invitation claims cannot create a third human seat',async()=>{
  alice();const extra=(await (await action('create',{characters:['pip']})).json()).chat;
  bob();const a=action('join',{token:extra.inviteToken});
  globalThis.__gekoUser={userId:'charlie',email:'charlie@example.test',displayName:'Charlie',fullName:'Charlie'};const b=action('join',{token:extra.inviteToken});
  const results=await Promise.all([a,b]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  alice();const c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+extra.id))).json()).chat;assert.equal(c.members.length,2);await action('delete',{groupId:extra.id});bob();
 });
 await t.test('simultaneous human messages are both retained',async()=>{
  alice();const a=action('message',{groupId:group.id,content:'Concurrent Alice'});bob();const b=action('message',{groupId:group.id,content:'Concurrent Bob'});
  for(const response of await Promise.all([a,b]))assert.equal(response.status,200);
  const c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;assert.ok(c.messages.some(m=>m.content==='Concurrent Alice'));assert.ok(c.messages.some(m=>m.content==='Concurrent Bob'));
 });
 await t.test('leaving revokes membership and rotates the old invitation',async()=>{assert.equal((await action('leave',{groupId:group.id})).status,200);assert.equal((await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).status,404);assert.equal((await action('join',{token})).status,404);alice();const c=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).json()).chat;assert.equal(c.members.length,1);assert.notEqual(c.inviteToken,token);});
 await t.test('deleting a group removes the room and its shared history',async()=>{assert.equal((await action('delete',{groupId:group.id})).status,200);assert.equal((await groups.GET(new Request('https://geko.test/api/groups?id='+group.id))).status,404);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM group_messages WHERE group_id=?').get(group.id).n,0);});
});

test('release validation and editing workflows',async t=>{
 alice();
 const action=(action,body={})=>groups.POST(req({action,...body}));
 await t.test('invalid persona, lorebook, memory, profile, chat and record shapes are rejected',async()=>{
  const invalid=[['persona',{id:'bad-persona',name:'Test',description:42,avatar:0}],['lorebook',{id:'bad-lore',name:'Test',entries:'not-an-array'}],['memory',{id:'bad-memory',characterId:'elara',content:''}],['profile',{id:'profile:alice',name:'Test',bio:'',favorites:{}}],['chat',{...chat,id:'bad-chat',messages:[{id:'m',role:'system',content:'Pretend to be a system message',created:new Date().toISOString()}]}],['unknown',{id:'unknown'}]];
  for(const [kind,value] of invalid)assert.equal((await put(kind,value)).status,400,kind);
 });
 await t.test('a starter character ID and unsafe avatar payload cannot be published',async()=>{
  assert.equal((await put('character',{...character,id:'elara'})).status,400);
  assert.equal((await put('character',{...character,id:'bad-avatar',image:'javascript:alert(1)'})).status,400);
 });
 await t.test('personal chats cannot masquerade as shared rooms or exceed two AI characters',async()=>{
  assert.equal((await put('chat',{...chat,id:'fake-group',isGroup:true})).status,400);
  assert.equal((await put('chat',{...chat,id:'three-ai',characters:['elara','kael','mika']})).status,400);
 });
 await t.test('character edits, visibility changes, and deletion persist',async()=>{
  const c={...character,id:'release-character',name:'Release character'};
  assert.equal((await put('character',c)).status,200);assert.equal((await put('character',{...c,name:'Edited character',visibility:'shared'})).status,200);
  bob();const shared=await (await data.GET()).json();assert.equal(shared.characters.find(x=>x.id===c.id).name,'Edited character');
  alice();await put('character',{...c,visibility:'private'});bob();assert.equal((await (await data.GET()).json()).characters.some(x=>x.id===c.id),false);
  alice();await data.DELETE(req({id:c.id}));assert.equal((await (await data.GET()).json()).characters.some(x=>x.id===c.id),false);
 });
 await t.test('personal message edits, ratings, pins, variants and removal survive reload',async()=>{
  const m={id:'editable-message',role:'assistant',speaker:'elara',name:'Elara',content:'Second choice',variants:['First choice','Second choice'],variant:1,rating:4,pinned:true,created:new Date().toISOString()};
  const c={...chat,id:'release-chat',characters:['elara'],messages:[m]};assert.equal((await put('chat',c)).status,200);
  let loaded=(await (await data.GET()).json()).items.find(x=>x.id===c.id);assert.deepEqual(loaded.messages[0],m);
  await put('chat',{...c,messages:[{...m,content:'Manually edited',variants:undefined,variant:undefined}]});
  loaded=(await (await data.GET()).json()).items.find(x=>x.id===c.id);assert.equal(loaded.messages[0].content,'Manually edited');assert.equal(loaded.messages[0].variants,undefined);
  await data.DELETE(req({id:c.id}));
 });
 await t.test('persona, lorebook, memory, favorites and profile changes round-trip',async()=>{
  const records=[['persona',{id:'release-persona',name:'Aster',description:'A traveler',avatar:1,isDefault:true}],['lorebook',{id:'release-lore',name:'World',entries:[{id:'entry',name:'Place',keywords:'city, town',content:'Old walls',always:false,enabled:true}]}],['memory',{id:'release-memory',characterId:'elara',content:'A remembered promise'}],['profile',{id:'profile:alice',name:'Alice',bio:'Stories and systems',favorites:['elara','pip']}]];
  for(const [kind,value] of records)assert.equal((await put(kind,value)).status,200);
  const loaded=await (await data.GET()).json();for(const [,value] of records){const stored=loaded.items.find(i=>i.id===value.id);for(const key of Object.keys(value))assert.deepEqual(stored[key],value[key]);}
 });
 await t.test('zero creativity is saved as zero, not silently changed to the default',async()=>{
  const r=await connection.POST(req({url:'https://ai.example.test',model:'test',temperature:0}));assert.equal(r.status,200);assert.equal((await r.json()).connection.temperature,0);
 });
 await t.test('gateway token preservation, removal, and invalid URLs behave correctly',async()=>{
  await connection.POST(req({url:'https://ai.example.test',model:'test',token:'temporary-secret'}));
  let r=await connection.POST(req({url:'https://ai.example.test',model:'test'}));assert.equal((await r.json()).connection.hasToken,true);
  r=await connection.POST(req({url:'https://ai.example.test',model:'test',clearToken:true}));assert.equal((await r.json()).connection.hasToken,false);
  for(const url of ['http://example.test','https://user:pass@example.test','https://127.0.0.1','https://[::1]','https://example.test?token=secret'])assert.equal((await connection.POST(req({url,model:'test'}))).status,400,url);
 });
 await t.test('a gateway HTTP failure is surfaced without leaving a group locked',async()=>{
  const c=(await (await action('create',{characters:['pip']})).json()).chat;
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('down',{status:502});
  try{const r=await groupGenerate.POST(req({groupId:c.id,characterId:'pip'}));assert.equal(r.status,400);assert.match((await r.json()).error,/502/);const reload=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+c.id))).json()).chat;assert.equal(reload.generating,false);}finally{globalThis.fetch=originalFetch;}
  await action('delete',{groupId:c.id});
 });
 await t.test('invitation replacement revokes the old link',async()=>{
  const c=(await (await action('create',{characters:['pip']})).json()).chat;
  const replacement=(await (await action('rotate-invite',{groupId:c.id})).json()).chat;assert.notEqual(replacement.inviteToken,c.inviteToken);
  bob();assert.equal((await action('join',{token:c.inviteToken})).status,404);assert.equal((await action('join',{token:replacement.inviteToken})).status,200);
  alice();await action('delete',{groupId:c.id});
 });
 await t.test('group messages can be edited, pinned, rated and truncated by authorized members',async()=>{
  const c=(await (await action('create',{characters:['pip']})).json()).chat;
  let current=(await (await action('message',{groupId:c.id,content:'Original message'})).json()).chat;const message=current.messages.find(m=>m.content==='Original message');
  current=(await (await action('edit-message',{groupId:c.id,messageId:message.id,patch:{content:'Edited message',pinned:true}})).json()).chat;
  assert.equal(current.messages.find(m=>m.id===message.id).content,'Edited message');assert.equal(current.messages.find(m=>m.id===message.id).pinned,true);
  const ai=current.messages.find(m=>m.role==='assistant');current=(await (await action('edit-message',{groupId:c.id,messageId:ai.id,patch:{rating:3}})).json()).chat;assert.equal(current.messages.find(m=>m.id===ai.id).rating,3);
  current=(await (await action('truncate',{groupId:c.id,messageId:message.id})).json()).chat;assert.equal(current.messages.some(m=>m.id===message.id),false);await action('delete',{groupId:c.id});
 });
 await t.test('Stop keeps visible text received after the most recent database save',async()=>{
  const c=(await (await action('create',{characters:['pip']})).json()).chat;
  const originalFetch=globalThis.fetch;let source;
  globalThis.fetch=async()=>new Response(new ReadableStream({start(controller){source=controller;}}));
  try{
   const response=await groupGenerate.POST(req({groupId:c.id,characterId:'pip'}));
   const messageId=response.headers.get('X-Group-Message-Id'),reader=response.body.getReader(),encoder=new TextEncoder();
   source.enqueue(encoder.encode(JSON.stringify({message:{content:'First'}})+'\n'));await reader.read();
   await new Promise(resolve=>setImmediate(resolve));
   source.enqueue(encoder.encode(JSON.stringify({message:{content:' second'}})+'\n'));await reader.read();
   const saved=sqlite.prepare('SELECT data FROM group_messages WHERE id=?').get(messageId);
   assert.equal(JSON.parse(saved.data).content,'First');
   assert.equal((await action('stop',{groupId:c.id,messageId,visible:'Changed prefix'})).status,400);
   assert.equal((await action('stop',{groupId:c.id,messageId,visible:'x'.repeat(40001)})).status,400);
   const stopped=await action('stop',{groupId:c.id,messageId,visible:'First second'});
   assert.equal(stopped.status,200);assert.equal((await stopped.json()).chat.messages.at(-1).content,'First second');
   source.enqueue(encoder.encode(JSON.stringify({message:{content:' unseen tail'}})+'\n'));source.close();
   while(!(await reader.read()).done){}
   const reload=(await (await groups.GET(new Request('https://geko.test/api/groups?id='+c.id))).json()).chat;
   assert.equal(reload.messages.at(-1).content,'First second');assert.equal(reload.generating,false);
  }finally{globalThis.fetch=originalFetch;}
  await action('delete',{groupId:c.id});
 });
 await t.test('anonymous users cannot read groups, change settings or generate text',async()=>{
  globalThis.__gekoUser=null;assert.equal((await groups.GET(new Request('https://geko.test/api/groups'))).status,401);assert.equal((await connection.POST(req({}))).status,401);assert.equal((await generate.POST(req({}))).status,401);assert.equal((await groupGenerate.POST(req({}))).status,401);alice();
 });
});
