try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { authReady } = await import('../../lib/selfhost/auth.mjs');
await authReady();
console.log('Application and authentication migrations are up to date.');
