try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { authReady } = await import('../src/lib/auth.mjs');
await authReady();
console.log('Application and authentication migrations are up to date.');
