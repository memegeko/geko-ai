import { headers } from 'next/headers';
import { database as sqliteDatabase } from './storage.mjs';
import { currentIdentity, publicConfig, sessionFor, mfaVerified } from './auth.mjs';
export { authHandler, initializeOwner } from './auth.mjs';
export interface Statement {
 bind(...values: unknown[]): Statement;
 first<T = Record<string, unknown>>(): Promise<T | null>;
 all<T = Record<string, unknown>>(): Promise<{results: T[]}>;
 run(): Promise<{success: boolean; meta: {changes: number}}>;
}
export interface Database {
 prepare(sql: string): Statement;
 batch(statements: Statement[]): Promise<{success: boolean; meta: {changes: number}}[]>;
}
export function database(): Database { return sqliteDatabase as unknown as Database; }
export async function currentUser() { return currentIdentity(await headers()); }
export const authConfig=publicConfig;
export async function accountInfo() {
  const session=await sessionFor(await headers());
  return session ? { user:{id:session.user.id,email:session.user.email,name:session.user.name},mode:'selfhost',twoFactorEnabled:!!session.user.twoFactorEnabled,requiresTwoFactor:!mfaVerified(session) } : null;
}
export function privateOllamaAllowed() { return process.env.ALLOW_PRIVATE_OLLAMA !== 'false'; }
