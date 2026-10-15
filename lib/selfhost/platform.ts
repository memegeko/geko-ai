import { headers } from 'next/headers';
import { database as sqliteDatabase } from './storage.mjs';
import { currentIdentity, publicConfig, sessionFor, mfaVerified } from './auth.mjs';
export { authHandler, initializeOwner } from './auth.mjs';
export function database(): D1Database { return sqliteDatabase as unknown as D1Database; }
export async function currentUser() { return currentIdentity(await headers()); }
export const authConfig=publicConfig;
export async function accountInfo() {
  const session=await sessionFor(await headers());
  return session ? { user:{id:session.user.id,email:session.user.email,name:session.user.name},mode:'selfhost',twoFactorEnabled:!!session.user.twoFactorEnabled,requiresTwoFactor:!mfaVerified(session) } : null;
}
export function privateOllamaAllowed() { return process.env.ALLOW_PRIVATE_OLLAMA !== 'false'; }
