import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

let connection;
export function sqlite() {
  if (connection) return connection;
  const filename = resolve(process.env.DATA_DIR || './data', 'geko.sqlite');
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  connection = new DatabaseSync(filename);
  chmodSync(filename, 0o600);
  connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  connection.exec('CREATE TABLE IF NOT EXISTS _geko_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
  for (const name of readdirSync(resolve('drizzle')).filter(n => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(resolve('drizzle', name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = connection.prepare('SELECT checksum FROM _geko_migrations WHERE name=?').get(name);
    if (previous) {
      if (previous.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    connection.exec('BEGIN IMMEDIATE');
    try {
      connection.exec(sql);
      connection.prepare('INSERT INTO _geko_migrations VALUES (?,?)').run(name, checksum);
      connection.exec('COMMIT');
    } catch (error) { connection.exec('ROLLBACK'); throw error; }
  }
  connection.exec('CREATE TABLE IF NOT EXISTS _geko_mfa (session_id TEXT PRIMARY KEY, verified_at INTEGER NOT NULL)');
  return connection;
}

// Preserve the application's existing D1 query interface on a local SQLite file.
export const database = {
  prepare(sql) {
    let parameters = [];
    const query = {
      bind(...values) { parameters = values; return query; },
      async first() { return sqlite().prepare(sql).get(...parameters) || null; },
      async all() { return { results: sqlite().prepare(sql).all(...parameters) }; },
      _run() { const result = sqlite().prepare(sql).run(...parameters); return { success: true, meta: { changes: Number(result.changes) } }; },
      async run() { return query._run(); },
    };
    return query;
  },
  async batch(statements) {
    const db = sqlite();
    db.exec('BEGIN IMMEDIATE');
    try { const results = statements.map(statement => statement._run()); db.exec('COMMIT'); return results; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
