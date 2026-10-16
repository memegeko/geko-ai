import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=mkdtempSync(join(tmpdir(),'geko-bootstrap-'));
process.env.DATA_DIR=root;
const {sqlite}=await import('../src/lib/storage.mjs');
const {seedConnection}=await import('../src/lib/bootstrap.mjs');
test('installer connection defaults are seeded once and owner settings survive restarts',()=>{
 try {
  delete process.env.OLLAMA_URL;delete process.env.OLLAMA_MODEL;seedConnection();
  assert.equal(sqlite().prepare("SELECT * FROM config WHERE id='connection'").get(),undefined);
  process.env.OLLAMA_URL='http://ollama:11434';process.env.OLLAMA_MODEL='qwen3:8b';seedConnection();
  const read=()=>JSON.parse(sqlite().prepare("SELECT value FROM config WHERE id='connection'").get().value);
  assert.equal(read().url,'http://ollama:11434');assert.equal(read().model,'qwen3:8b');
  sqlite().prepare("UPDATE config SET value=? WHERE id='connection'").run(JSON.stringify({url:'https://owner.example',model:'owner-model'}));
  seedConnection();assert.equal(read().model,'owner-model');
  process.env.OLLAMA_URL='ftp://bad.example';assert.throws(seedConnection,/HTTP/);
 }finally {sqlite().close();rmSync(root,{recursive:true,force:true});}
});
