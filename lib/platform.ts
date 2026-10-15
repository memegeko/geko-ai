// Sites adapter. The standalone Next build resolves @geko/platform to selfhost/platform.ts.
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export function database(): D1Database { if (!env.DB) throw new Error('Database is unavailable'); return env.DB; }
export const currentUser = getChatGPTUser;
export async function initializeOwner(user: {userId: string}) { await database().prepare("INSERT OR IGNORE INTO config(id,value) VALUES('owner',?)").bind(JSON.stringify(user.userId)).run(); }
export function authConfig() { return { mode: 'sites', signIn: '/signin-with-chatgpt?return_to=/', signOut: '/signout-with-chatgpt?return_to=/', security: null, providers: [], registration: 'platform', passwordReset: false }; }
export async function authHandler(_request: Request) { return Response.json({error:'Authentication is managed by the hosting platform.'},{status:404}); }
export async function accountInfo() { const user=await currentUser(); return user ? { user, mode:'sites', twoFactorEnabled:false } : null; }
export function privateOllamaAllowed() { return false; }
