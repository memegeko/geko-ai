import { authReady } from '../../lib/selfhost/auth.mjs';
await authReady();
await import('../../server.js');
