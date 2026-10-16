import { sqlite } from './storage.mjs';

// Environment defaults never replace connection settings saved by the owner.
export function seedConnection() {
  const url = process.env.OLLAMA_URL, model = process.env.OLLAMA_MODEL;
  if (!url || !model) return;
  const endpoint = new URL(url);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('OLLAMA_URL must be an HTTP(S) endpoint without credentials, query, or fragment.');
  }
  sqlite().prepare("INSERT OR IGNORE INTO config(id,value) VALUES('connection',?)")
    .run(JSON.stringify({url: url.replace(/\/$/, ''), model, temperature: 0.8, context: 8192}));
}
