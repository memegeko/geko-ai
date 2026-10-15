import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,chmodSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {safeLoginReturn} from '../lib/login-return.mjs';
test('installer validates configuration, protects its secret, and preserves repeat installations',()=>{
 const root=mkdtempSync(join(tmpdir(),'geko-installer-'));mkdirSync(join(root,'scripts'));mkdirSync(join(root,'bin'));
 copyFileSync('scripts/install.sh',join(root,'scripts/install.sh'));copyFileSync('.env.example',join(root,'.env.example'));
 writeFileSync(join(root,'bin/docker'),'#!/usr/bin/env bash\n[[ "$1" == compose ]] || exit 1\nexit 0\n');chmodSync(join(root,'bin/docker'),0o755);
 const environment={...process.env,PATH:join(root,'bin')+':'+process.env.PATH};
 const run=args=>spawnSync('bash',[join(root,'scripts/install.sh'),...args],{env:environment,encoding:'utf8'});
 assert.equal(run(['--url','http://remote.example.com','--admin-email','admin@example.com','--non-interactive','--skip-start']).status,2);
 const good=run(['--url','http://localhost:3000','--admin-email','admin@example.com','--non-interactive','--skip-start']);assert.equal(good.status,0,good.stderr);
 const before=readFileSync(join(root,'.env'),'utf8');assert.match(before,/BETTER_AUTH_SECRET=[0-9a-f]{64}\n/);assert.equal((before.match(/^BETTER_AUTH_SECRET=/gm)||[]).length,1);assert.equal(statSync(join(root,'.env')).mode&0o777,0o600);
 assert.equal(run(['--non-interactive','--skip-start']).status,0);assert.equal(readFileSync(join(root,'.env'),'utf8'),before);
});
test('login return paths stay on the installation and preserve room invitations',()=>{
 for(const value of ['https://outside.example','//outside.example','/\\outside.example','/login','/api/auth/sign-out',null])assert.equal(safeLoginReturn(value),'/');
 assert.equal(safeLoginReturn('/?group_invite=abc#join'),'/?group_invite=abc#join');assert.equal(safeLoginReturn('/security'),'/security');
});
