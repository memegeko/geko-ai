// Exercise the built, traced production package, including the Docker entrypoint.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const source=process.cwd(),root=mkdtempSync(join(tmpdir(),'geko-production-')),data=join(root,'data');
cpSync(resolve('.next/standalone'),root,{recursive:true,verbatimSymlinks:true});
for(const [from,to] of [['.next/static','.next/static'],['public','public'],['database/migrations','database/migrations'],['scripts','scripts'],['src/lib','src/lib']])cpSync(resolve(from),join(root,to),{recursive:true,verbatimSymlinks:true});
const free=createServer();await new Promise(done=>free.listen(0,'127.0.0.1',done));const port=free.address().port;await new Promise(done=>free.close(done));
const origin=`http://127.0.0.1:${port}`;
const environment={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',HOSTNAME:'127.0.0.1',PORT:String(port),DATA_DIR:data,BETTER_AUTH_URL:origin,BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),ADMIN_EMAIL:'admin@example.test',ALLOWED_EMAILS:'friend@example.test',ALLOW_PRIVATE_OLLAMA:'true',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',SMTP_HOST:'',MAIL_FROM:'',REQUIRE_EMAIL_VERIFICATION:'false',OLLAMA_URL:'http://initial-ollama:11434',OLLAMA_MODEL:'initial-model'};
let child,logs='';
async function start(){
 child=spawn(process.execPath,['scripts/entrypoint.mjs'],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw new Error('Production process exited: '+logs.slice(-3000));
  try{const response=await fetch(origin+'/api/auth/config');if(response.ok)return;}catch{}
  await new Promise(done=>setTimeout(done,100));
 }
 throw new Error('Production process did not become ready: '+logs.slice(-3000));
}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(done=>child.once('exit',done));}}
const cookies=new Map(),friend=new Map();
async function api(path,method='GET',body,jar=cookies){
 const response=await fetch(origin+path,{method,headers:{'content-type':'application/json',origin,cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'x-forwarded-for':jar===friend?'203.0.113.5':'203.0.113.4'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');if(/max-age=0/i.test(cookie))jar.delete(pair.slice(0,i));else jar.set(pair.slice(0,i),pair.slice(i+1));}
 return response;
}
const ollama=createServer(async(request,response)=>{
 if(request.url==='/api/tags'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({models:[{name:'test-model'}]}));return;}
 assert.equal(request.url,'/api/chat');response.setHeader('Content-Type','application/x-ndjson');
 response.write('{"message":{"content":"Production "}}\n');
 setTimeout(()=>response.end('{"message":{"content":"reply"},"done":true}\n'),25);
});
try{
 await new Promise(done=>ollama.listen(0,'127.0.0.1',done));await start();
 for(const path of ['/','/login','/security','/brand/geko-mark.svg','/characters.png'])assert.equal((await api(path)).status,200,path);
 const config=await (await api('/api/auth/config')).json();assert.equal(config.mode,'selfhost');assert.deepEqual(config.providers,[]);
 assert.equal((await api('/api/data')).status,401);console.log('PASS production pages, assets, provider configuration, and anonymous access');
 const password='production-test-only-password-482';
 assert.equal((await api('/api/auth/sign-up/email','POST',{email:'admin@example.test',name:'Admin',password})).status,200);
 const initial=await (await api('/api/data')).json();assert.equal(initial.admin,true);assert.equal(initial.characters.length,8);assert.equal(initial.connection.url,environment.OLLAMA_URL);assert.equal(initial.connection.model,environment.OLLAMA_MODEL);
 assert.equal((await api('/api/auth/sign-up/email','POST',{email:'friend@example.test',name:'Friend',password},friend)).status,200);
 const other=await (await api('/api/data','GET',undefined,friend)).json();assert.equal(other.admin,false);
 const now=new Date().toISOString(),chat={id:'production-chat',title:'Production check',characters:['elara'],messages:[{id:'production-message',role:'user',content:'Hello',created:now}],updated:now};
 assert.equal((await api('/api/data','PUT',{kind:'chat',data:chat})).status,200);
 assert.equal((await (await api('/api/data','GET',undefined,friend)).json()).items.length,0);
 const modelUrl=`http://127.0.0.1:${ollama.address().port}`;
 const connection={url:modelUrl,model:'test-model',temperature:0,context:4096};
 assert.equal((await api('/api/connection','POST',{...connection,action:'test'})).status,200);
 assert.equal((await api('/api/connection','POST',connection)).status,200);
 const reply=await api('/api/generate','POST',{chatId:chat.id,characterId:'elara'});assert.equal(reply.status,200);assert.match(await reply.text(),/Production/);
 console.log('PASS real HTTP registration, account isolation, local Ollama settings, and streamed replies');
 const room=await (await api('/api/groups','POST',{action:'create',characters:['elara','mika']})).json();assert.ok(room.chat?.inviteToken);
 const joined=await (await api('/api/groups','POST',{action:'join',token:room.chat.inviteToken},friend)).json();assert.equal(joined.chat.members.length,2);
 const groupReply=await api('/api/groups/generate','POST',{groupId:room.chat.id,characterId:'elara'});assert.equal(groupReply.status,200);await groupReply.text();
 const saved=await (await api('/api/groups?id='+room.chat.id,'GET',undefined,friend)).json();assert.equal(saved.chat.messages.at(-1).content,'Production reply');console.log('PASS two-account group membership and server-persisted group generation');
 const backup=spawn(process.execPath,['scripts/backup.mjs',join(root,'backups','snapshot.sqlite')],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});let backupError='';backup.stderr.on('data',chunk=>{backupError+=chunk;});
 assert.equal(await new Promise(done=>backup.once('exit',done)),0,backupError);
 const snapshot=new DatabaseSync(join(root,'backups','snapshot.sqlite'),{readOnly:true});assert.equal(snapshot.prepare("SELECT count(*) n FROM records WHERE id='production-chat'").get().n,1);snapshot.close();
 await stop();await start();const reloaded=await (await api('/api/data')).json();assert.equal(reloaded.user.id,initial.user.id);assert.ok(reloaded.items.some(record=>record.id===chat.id));assert.equal(reloaded.connection.url,modelUrl);assert.equal(reloaded.connection.model,'test-model');console.log('PASS consistent online backup, process restart, persistent session, and saved conversations');
}finally{await stop();await new Promise(done=>ollama.close(done));}
