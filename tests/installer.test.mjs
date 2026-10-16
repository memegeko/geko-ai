import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,chmodSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {safeLoginReturn} from '../src/lib/login-return.mjs';

function fixture() {
 const root=mkdtempSync(join(tmpdir(),'geko-installer-')),source=join(root,'source'),bin=join(root,'bin');
 mkdirSync(join(source,'src/lib'),{recursive:true});mkdirSync(bin);
 for(const file of ['.env.example','compose.yaml','package.json'])copyFileSync(file,join(source,file));
 writeFileSync(join(source,'src/lib/storage.mjs'),'');
 const log=join(root,'docker.log');
 writeFileSync(join(bin,'docker'),`#!/usr/bin/env bash
printf '%s\\n' "$*" >> '${log}'
if [[ "$*" == *'ollama pull'* && "\${FAIL_PULL:-}" == 1 ]]; then exit 1; fi
if [[ "$1" == compose && "$2" == up && "\${FAIL_UP:-}" == 1 ]]; then exit 1; fi
exit 0
`);chmodSync(join(bin,'docker'),0o755);
 const environment={...process.env,PATH:bin+':'+process.env.PATH};
 const run=(args=[],extra={})=>spawnSync('bash',[resolve('install.sh'),'--dir',source,'--no-deps','--non-interactive',...args],{env:{...environment,...extra},encoding:'utf8'});
 const env=()=>readFileSync(join(source,'.env'),'utf8');
 return {root,source,run,env,log:()=>readFileSync(log,'utf8'),cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
const basic=['--url','http://localhost:3000','--admin-email','admin@example.com','--gpu','cpu'];
test('installer validates values, protects secrets, and preserves configuration on rerun',()=>{
 const f=fixture();try {
  for(const args of [[],['--url','http://remote.example.com','--admin-email','admin@example.com'],[...basic,'--port','65536'],[...basic,'--model','bad$(whoami)'],[...basic,'--admin-email','evil@example.com\nEVIL=1'],['--url'],[...basic,'--bind','bad']]){
   const result=f.run(args);assert.equal(result.status,2,result.stdout+result.stderr);
  }
  const good=f.run([...basic,'--skip-start']);assert.equal(good.status,0,good.stderr);
  const before=f.env();assert.match(before,/BETTER_AUTH_SECRET=[0-9a-f]{64}\n/);assert.equal((before.match(/^BETTER_AUTH_SECRET=/gm)||[]).length,1);
  assert.equal(statSync(join(f.source,'.env')).mode&0o777,0o600);
  assert.match(before,/COMPOSE_PROFILES=local/);assert.match(before,/OLLAMA_URL=http:\/\/ollama:11434/);
  assert.equal(f.run(['--skip-start']).status,0);assert.equal(f.env(),before);
  assert.doesNotMatch(f.log(),/compose up|ollama pull/);
 }finally {f.cleanup();}
});
test('default install builds healthy services and downloads the selected model',()=>{
 const f=fixture();try {
  const result=f.run([...basic,'--model','qwen3:4b']);assert.equal(result.status,0,result.stderr);
  assert.match(f.log(),/compose up -d --build --wait/);assert.match(f.log(),/compose exec -T ollama ollama pull qwen3:4b/);
  assert.equal(f.run([]).status,0);assert.equal((f.log().match(/ollama pull/g)||[]).length,2,'rerun resumes/verifies the model pull');
 }finally {f.cleanup();}
});
test('skip model installs the application and local Ollama without pulling weights',()=>{
 const f=fixture();try {
  const result=f.run([...basic,'--skip-model']);assert.equal(result.status,0,result.stderr);
  assert.match(f.env(),/GEKO_DOWNLOAD_MODEL=false/);assert.match(f.log(),/compose up/);assert.doesNotMatch(f.log(),/ollama pull/);
  assert.match(result.stdout,/Model download skipped/);
 }finally {f.cleanup();}
});
test('existing Ollama mode never installs a local model or enables the local service',()=>{
 const f=fixture();try {
  const result=f.run([...basic,'--ollama-url','http://192.168.2.20:11434','--model','my-model:latest']);assert.equal(result.status,0,result.stderr);
  assert.match(f.env(),/^COMPOSE_PROFILES=$/m);assert.match(f.env(),/OLLAMA_URL=http:\/\/192.168.2.20:11434/);
  assert.doesNotMatch(f.log(),/ollama pull/);
 }finally {f.cleanup();}
});
test('NVIDIA configuration selects the GPU override without changing the CPU base file',()=>{
 const f=fixture();try {
  const result=f.run([...basic,'--gpu','nvidia','--skip-start']);assert.equal(result.status,0,result.stderr);
  assert.match(f.env(),/COMPOSE_FILE=compose.yaml:deploy\/compose.nvidia.yaml/);
 }finally {f.cleanup();}
});
test('failed start and model pull report failure and retain resumable configuration',()=>{
 for(const failure of ['FAIL_UP','FAIL_PULL']){
  const f=fixture();try {
   const result=f.run(basic,{[failure]:'1'});assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/geko.ai is ready/);
   const before=f.env();assert.equal(f.run([]).status,0);assert.equal(f.env(),before);
  }finally {f.cleanup();}
 }
});
test('installer also runs from piped stdin without mistaking it for prompt input',()=>{
 const f=fixture();try {
  const result=spawnSync('bash',['-s','--','--dir',f.source,'--no-deps','--non-interactive',...basic,'--skip-start'],{
   input:readFileSync('install.sh'),env:{...process.env,PATH:join(f.root,'bin')+':'+process.env.PATH},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.match(f.env(),/ADMIN_EMAIL=admin@example.com/);
 }finally {f.cleanup();}
});
test('login return paths stay on the installation and preserve room invitations',()=>{
 for(const value of ['https://outside.example','//outside.example','/\\outside.example','/login','/api/auth/sign-out',null])assert.equal(safeLoginReturn(value),'/');
 assert.equal(safeLoginReturn('/?group_invite=abc#join'),'/?group_invite=abc#join');assert.equal(safeLoginReturn('/security'),'/security');
});
