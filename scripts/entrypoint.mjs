import { authReady } from '../src/lib/auth.mjs';
await authReady();
await import('../server.js');
