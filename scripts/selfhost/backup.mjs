import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const source = new DatabaseSync(resolve(process.env.DATA_DIR || './data', 'geko.sqlite'), { readOnly: true });
const target = resolve(process.argv[2] || `./backups/geko-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
mkdirSync(resolve(target, '..'), {recursive:true, mode:0o700});
await backup(source, target); chmodSync(target,0o600); source.close(); console.log(target);
