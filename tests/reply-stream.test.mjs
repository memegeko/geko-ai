import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('.test-cache',{recursive:true});
const source=await readFile('src/lib/reply-stream.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
await writeFile('.test-cache/reply-stream.mjs',output.outputText);
const {readOllamaReply,createReplyReveal}=await import('../.test-cache/reply-stream.mjs');
const encode=s=>new TextEncoder().encode(s);
const packet=text=>JSON.stringify({message:{content:text}})+'\n';
function clock(){let time=0,serial=0;const tasks=new Map();return {now:()=>time,schedule:cb=>{const id=++serial;tasks.set(id,cb);return id;},cancel:id=>tasks.delete(id),hidden:()=>false,step(){time+=12;const callbacks=[...tasks.values()];tasks.clear();callbacks.forEach(cb=>cb());},drain(){let ticks=0;while(tasks.size){this.step();if(++ticks>10000)throw new Error('Typing queue never settled');}},pending:()=>tasks.size};}
test('renders the first network text before the response finishes',async()=>{
 let controller;const chunks=[];const body=new ReadableStream({start(c){controller=c;}});
 const reading=readOllamaReply(body,s=>chunks.push(s));
 controller.enqueue(encode(packet('Hello')));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(chunks,['Hello']);
 controller.enqueue(encode(packet(' there')));controller.close();
 await reading;assert.equal(chunks.join(''),'Hello there');
});
test('handles single-byte UTF-8 packets, multiple lines and a final line without newline',async()=>{
 const text='Hi 👩🏽‍💻 — café!';const bytes=encode(packet(text)+JSON.stringify({message:{content:' Again.'},done:true}));
 const body=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}});
 let result='';await readOllamaReply(body,s=>result+=s);assert.equal(result,text+' Again.');
});
test('surfaces Ollama streaming errors while retaining earlier text',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(encode(packet('A partial reply')+'{"error":"Model stopped"}\n'));c.close();}});
 let result='';await assert.rejects(readOllamaReply(body,s=>result+=s),/Model stopped/);assert.equal(result,'A partial reply');
});
test('a coalesced paragraph is revealed progressively and finish waits for its final character',async()=>{
 const scheduler=clock(),updates=[];const reveal=createReplyReveal(s=>updates.push(s),scheduler);
 const text='A full paragraph arrived in a single network packet. '.repeat(12);
 reveal.append(text);let finished=false;const done=reveal.finish().then(()=>finished=true);
 scheduler.step();await Promise.resolve();assert.equal(finished,false);assert.ok(updates[0].length>0&&updates[0].length<=4);
 scheduler.step();assert.ok(reveal.text.length<text.length);assert.ok(reveal.text.startsWith(updates[0]));
 scheduler.drain();await done;assert.equal(reveal.text,text);assert.equal(updates.at(-1),text);
 const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 for(let i=1;i<updates.length;i++)assert.ok([...graphemes.segment(updates[i].slice(updates[i-1].length))].length<=4);
});
test('stopping discards queued characters and does not reveal a hidden tail afterward',async()=>{
 const scheduler=clock(),controller=new AbortController(),updates=[];
 const reveal=createReplyReveal(s=>updates.push(s),{...scheduler,signal:controller.signal});
 reveal.append('This whole answer has arrived, but only a few letters should be visible.');scheduler.step();scheduler.step();
 const visible=reveal.text;assert.ok(visible.length>0&&visible.length<70);
 controller.abort();assert.equal(await reveal.finish(),visible);
 reveal.append('Late chunk');scheduler.drain();assert.equal(reveal.text,visible);assert.equal(updates.at(-1),visible);assert.equal(scheduler.pending(),0);
});
test('aborting before the first character settles without fabricating a reply',async()=>{
 const scheduler=clock(),controller=new AbortController();const reveal=createReplyReveal(()=>assert.fail('No text should be shown'),{...scheduler,signal:controller.signal});
 reveal.append('Queued text');controller.abort();assert.equal(await reveal.finish(),'');assert.equal(scheduler.pending(),0);
});
test('typed text preserves whole emoji graphemes and accented characters',async()=>{
 const scheduler=clock(),updates=[],text='👩🏽‍💻 é 🏳️‍🌈 hello';
 const reveal=createReplyReveal(s=>updates.push(s),scheduler);reveal.append(text);const done=reveal.finish();scheduler.drain();await done;
 const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});const boundaries=[...segmenter.segment(text)].map(s=>s.index+s.segment.length);
 for(const update of updates)assert.ok(boundaries.includes(update.length));assert.equal(reveal.text,text);
});
test('a delayed render tick does not dump the buffered paragraph',async()=>{
 let task,time=0;const updates=[];const reveal=createReplyReveal(s=>updates.push(s),{now:()=>time,schedule:cb=>{task=cb;return 1;},cancel:()=>{},hidden:()=>false});
 reveal.append('x'.repeat(2000));time=20000;task();assert.ok(reveal.text.length>0&&reveal.text.length<=4);reveal.stop();
});
test('the network reader cancels cleanly on stop',async()=>{
 let controller,cancelled=false;const body=new ReadableStream({start(c){controller=c;},cancel(){cancelled=true;}});
 const signal=new AbortController();let text='';const reading=readOllamaReply(body,s=>text+=s,signal.signal);
 controller.enqueue(encode(packet('Visible')));await new Promise(resolve=>setImmediate(resolve));signal.abort();
 await assert.rejects(reading,e=>e.name==='AbortError');assert.equal(cancelled,true);assert.equal(text,'Visible');
});
