import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, randomBytes } from 'node:crypto';
const directory=mkdtempSync(join(tmpdir(),'geko-selfhost-'));
process.env.DATA_DIR=directory;
process.env.BETTER_AUTH_URL='http://localhost:3000';
process.env.BETTER_AUTH_SECRET=randomBytes(48).toString('hex');
process.env.ADMIN_EMAIL='admin@example.test';
process.env.ALLOWED_EMAILS='friend@example.test,social@example.test';
process.env.GOOGLE_CLIENT_ID='test-google-id';process.env.GOOGLE_CLIENT_SECRET='test-google-secret';
process.env.GITHUB_CLIENT_ID='test-github-id';process.env.GITHUB_CLIENT_SECRET='test-github-secret';
const {authReady,authHandler,currentIdentity,initializeOwner,publicConfig,sessionFor}=await import('../lib/selfhost/auth.mjs');
const {sqlite,database}=await import('../lib/selfhost/storage.mjs');
const service=await authReady();
const origin=process.env.BETTER_AUTH_URL;
let clientNumber=0;const clients=new WeakMap();
function jar(){const value=new Map();clients.set(value,'203.0.113.'+(++clientNumber));return value;}
const owner=jar(),guest=jar();
function headers(cookies){return new Headers({'content-type':'application/json',origin,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'x-forwarded-for':clients.get(cookies)||'203.0.113.200'});}
async function call(path,body,cookies=owner){
 const response=await authHandler(new Request(origin+'/api/auth'+path,{method:body===undefined?'GET':'POST',headers:headers(cookies),...(body===undefined?{}:{body:JSON.stringify(body)})}));
 for(const cookie of response.headers.getSetCookie()){
  const pair=cookie.split(';')[0],i=pair.indexOf('=');if(/max-age=0/i.test(cookie))cookies.delete(pair.slice(0,i));else cookies.set(pair.slice(0,i),pair.slice(i+1));
 }
 let data;try{data=await response.json();}catch{data=null;}
 return {status:response.status,data,headers:response.headers};
}
function totp(uri){
 const secret=new URL(uri).searchParams.get('secret'),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
 for(const char of secret.toUpperCase().replaceAll('=',''))bits+=alphabet.indexOf(char).toString(2).padStart(5,'0');
 const key=Buffer.from((bits.match(/.{8}/g)||[]).map(b=>parseInt(b,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const digest=createHmac('sha1',key).update(counter).digest(),offset=digest.at(-1)&15;
 return ((digest.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
const password='test-only-strong-password-493';let setup,recovery,userId;
test('standalone authentication and persistent storage',async t=>{
 await t.test('migrations initialize application and authentication tables',async()=>{
  assert.equal(sqlite().prepare('SELECT count(*) n FROM _geko_migrations').get().n,2);
  for(const name of ['records','group_rooms','user','session','twoFactor'])assert.ok(sqlite().prepare("SELECT name FROM sqlite_master WHERE name=?").get(name));
  await authReady();assert.equal(sqlite().prepare('SELECT count(*) n FROM _geko_migrations').get().n,2);
 });
 await t.test('a noninvited account cannot register',async()=>{const r=await call('/sign-up/email',{email:'stranger@example.test',name:'Stranger',password},jar());assert.equal(r.status,403);});
 await t.test('an invited member can register but cannot claim administrator ownership',async()=>{
  const r=await call('/sign-up/email',{email:'friend@example.test',name:'Friend',password},guest);assert.equal(r.status,200,JSON.stringify(r.data));
  const identity=await currentIdentity(headers(guest));assert.equal(identity.email,'friend@example.test');await initializeOwner(identity);assert.equal(sqlite().prepare("SELECT * FROM config WHERE id='owner'").get(),undefined);
 });
 await t.test('email/password registration stores a hash and grants only the configured admin ownership',async()=>{
  const r=await call('/sign-up/email',{email:'admin@example.test',name:'Administrator',password});assert.equal(r.status,200,JSON.stringify(r.data));
  const identity=await currentIdentity(headers(owner));userId=identity.userId;await initializeOwner(identity);
  assert.equal(JSON.parse(sqlite().prepare("SELECT value FROM config WHERE id='owner'").get().value),userId);
  assert.notEqual(sqlite().prepare("SELECT password FROM account WHERE userId=? AND providerId='credential'").get(userId).password,password);
 });
 await t.test('proxy identity headers cannot forge a signed-in account',async()=>{
  const forged=new Headers({'oai-authenticated-user-id':userId,'oai-authenticated-user-email':'admin@example.test'});assert.equal(await currentIdentity(forged),null);
 });
 await t.test('a valid session cannot write application data from a different origin',async()=>{
  const crossOrigin=headers(owner);crossOrigin.set('origin','https://other.example');
  await assert.rejects(()=>currentIdentity(crossOrigin),/FORBIDDEN/);
 });
 await t.test('OAuth providers are advertised only when configured and build correct redirects',async()=>{
  assert.deepEqual(publicConfig().providers,['google','github']);
  for(const provider of ['google','github']){const r=await call('/sign-in/social',{provider,callbackURL:'/login?complete=1'},jar());assert.equal(r.status,200,JSON.stringify(r.data));const target=new URL(r.data.url);assert.ok(target.hostname.endsWith(provider==='google'?'google.com':'github.com'));assert.equal(target.searchParams.get('redirect_uri'),origin+'/api/auth/callback/'+provider);assert.ok(target.searchParams.get('state'));}
 });
 await t.test('cross-origin authentication writes are refused',async()=>{
  const response=await authHandler(new Request(origin+'/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example','x-forwarded-for':'203.0.113.99'},body:JSON.stringify({email:'admin@example.test',password})}));assert.equal(response.status,403);
 });
 await t.test('2FA remains inactive until an authenticator code is verified',async()=>{
  const r=await call('/two-factor/enable',{password});assert.equal(r.status,200,JSON.stringify(r.data));setup=r.data;recovery=setup.backupCodes;
  assert.match(setup.totpURI,/^otpauth:/);assert.ok(recovery.length>=8);
  assert.equal((await sessionFor(headers(owner))).user.twoFactorEnabled,false);
  assert.notEqual(sqlite().prepare('SELECT secret FROM twoFactor WHERE userId=?').get(userId).secret,new URL(setup.totpURI).searchParams.get('secret'));
  assert.equal((await call('/two-factor/verify-totp',{code:totp(setup.totpURI)})).status,200);
  assert.equal((await sessionFor(headers(owner))).user.twoFactorEnabled,true);assert.equal((await currentIdentity(headers(owner))).userId,userId);
 });
 await t.test('password login with 2FA withholds application access until verification',async()=>{
  await call('/sign-out',{});const r=await call('/sign-in/email',{email:'admin@example.test',password});assert.equal(r.status,200);assert.equal(r.data.twoFactorRedirect,true);
  assert.equal(await currentIdentity(headers(owner)),null);
  assert.equal((await call('/two-factor/verify-totp',{code:'invalid'})).status,401);
  assert.equal((await call('/two-factor/verify-totp',{code:totp(setup.totpURI)})).status,200);
  assert.equal((await currentIdentity(headers(owner))).userId,userId);
 });
 await t.test('a social-style session cannot bypass enabled 2FA or disable it before verifying',async()=>{
  const ctx=await service.$context,session=await ctx.internalAdapter.createSession(userId,false);
  const signature=createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(session.token).digest('base64');
  const social=jar();social.set(ctx.authCookies.sessionToken.name,encodeURIComponent(session.token+'.'+signature));
  assert.ok(await sessionFor(headers(social)));
  await assert.rejects(()=>currentIdentity(headers(social)),/TWO_FACTOR_REQUIRED/);
  assert.equal((await call('/two-factor/disable',{password},social)).status,403);
  assert.equal((await call('/two-factor/verify-totp',{code:totp(setup.totpURI)},social)).status,200);
  assert.equal((await currentIdentity(headers(social))).userId,userId);
 });
 await t.test('recovery codes complete a challenge once and cannot be reused',async()=>{
  const codes=jar();await call('/sign-in/email',{email:'admin@example.test',password},codes);
  assert.equal((await call('/two-factor/verify-backup-code',{code:recovery[0]},codes)).status,200);
  assert.equal((await currentIdentity(headers(codes))).userId,userId);
  await call('/sign-out',{},codes);await call('/sign-in/email',{email:'admin@example.test',password},codes);
  assert.notEqual((await call('/two-factor/verify-backup-code',{code:recovery[0]},codes)).status,200);
 });
 await t.test('removing an invited address revokes its existing application session',async()=>{
  process.env.ALLOWED_EMAILS='social@example.test';assert.equal(await currentIdentity(headers(guest)),null);process.env.ALLOWED_EMAILS='friend@example.test,social@example.test';
 });
 await t.test('SQLite adapter preserves records and rolls back a failed batch',async()=>{
  await database.prepare('INSERT INTO config(id,value) VALUES(?,?)').bind('adapter-test','hello').run();assert.equal((await database.prepare('SELECT value FROM config WHERE id=?').bind('adapter-test').first()).value,'hello');
  await assert.rejects(()=>database.batch([database.prepare('INSERT INTO config VALUES(?,?)').bind('rollback','first'),database.prepare('INSERT INTO config VALUES(?,?)').bind('rollback','duplicate')]));assert.equal(await database.prepare('SELECT * FROM config WHERE id=?').bind('rollback').first(),null);
 });
 await t.test('repeated wrong passwords are rate-limited',async()=>{
  const limited=jar();let response;
  for(let i=0;i<12;i++){response=await call('/sign-in/email',{email:'admin@example.test',password:'incorrect-password'},limited);if(response.status===429)break;}
  assert.equal(response.status,429);
 });
 await t.test('sign-out invalidates the server session',async()=>{await call('/sign-out',{});assert.equal(await currentIdentity(headers(owner)),null);});
});
