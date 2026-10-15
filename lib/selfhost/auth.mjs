import { betterAuth, APIError } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { getMigrations } from 'better-auth/db/migration';
import nodemailer from 'nodemailer';
import { sqlite } from './storage.mjs';

let instance, ready, options;
export function publicConfig() {
  return {
    mode: 'selfhost', signIn: '/login', signOut: '/login?signout=1', security: '/security',
    providers: ['google', 'github'].filter(provider => process.env[`${provider.toUpperCase()}_CLIENT_ID`] && process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]),
    registration: 'invite-only', passwordReset: !!(process.env.SMTP_HOST && process.env.MAIL_FROM),
  };
}
export function allowedEmail(email) {
  return [process.env.ADMIN_EMAIL, ...(process.env.ALLOWED_EMAILS || '').split(',')]
    .filter(Boolean).map(value => value.trim().toLowerCase()).includes(String(email).trim().toLowerCase());
}
function configuration() {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!baseURL || !secret || secret.startsWith('replace-') || secret.length < 32 || !process.env.ADMIN_EMAIL) {
    throw new Error('Set BETTER_AUTH_URL, ADMIN_EMAIL, and a random BETTER_AUTH_SECRET of at least 32 characters.');
  }
  const url = new URL(baseURL);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('BETTER_AUTH_URL must be an HTTPS origin (HTTP is permitted only on loopback).');
  }
  return { baseURL: url.origin, secret };
}
async function sendMail(to, subject, text) {
  if (!publicConfig().passwordReset) throw new Error('Email delivery is not configured.');
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    requireTLS: port !== 465,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
function authOptions() {
  const settings = configuration(), mail = publicConfig().passwordReset;
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !mail) throw new Error('Email verification requires SMTP_HOST and MAIL_FROM.');
  const socialProviders = {};
  for (const provider of publicConfig().providers) socialProviders[provider] = {
    clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
    clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
  };
  return {
    appName: 'geko.ai', ...settings, database: sqlite(), trustedOrigins: [settings.baseURL],
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      revokeSessionsOnPasswordReset: true,
      ...(mail ? { sendResetPassword: async ({ user, url }) => sendMail(user.email, 'Reset your geko.ai password', `Reset your password using this link:\n${url}\n\nIgnore this email if you did not request it.`) } : {}),
    },
    ...(mail ? { emailVerification: { sendOnSignUp: true, sendVerificationEmail: async ({ user, url }) => sendMail(user.email, 'Verify your geko.ai email', `Verify your email address:\n${url}`) } } : {}),
    socialProviders,
    account: { accountLinking: { enabled: true, disableImplicitLinking: true, allowDifferentEmails: false }, encryptOAuthTokens: true },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
    advanced: { useSecureCookies: settings.baseURL.startsWith('https:'), ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
    plugins: [twoFactor({ issuer: 'geko.ai', allowPasswordless: true })],
    databaseHooks: {
      user: { create: { before: async user => {
        if (!allowedEmail(user.email)) throw new APIError('FORBIDDEN', { message: 'This email is not invited to this installation.' });
        return { data: user };
      } } },
      session: { create: { before: async session => {
        const user = sqlite().prepare('SELECT email FROM user WHERE id=?').get(session.userId);
        if (!user || !allowedEmail(user.email)) throw new APIError('FORBIDDEN', { message: 'Account access has been removed.' });
        return { data: session };
      } } },
    },
  };
}
export function auth() {
  instance ||= betterAuth(options ||= authOptions());
  return instance;
}
export async function authReady() {
  ready ||= (async () => { options ||= authOptions(); const migrations = await getMigrations(options); await migrations.runMigrations(); })();
  await ready;
  return auth();
}
export function mfaVerified(session) {
  return !session.user.twoFactorEnabled || !!sqlite().prepare('SELECT session_id FROM _geko_mfa WHERE session_id=?').get(session.session.id);
}
export async function sessionFor(headers) {
  const service = await authReady();
  const session = await service.api.getSession({ headers });
  if (!session || !allowedEmail(session.user.email)) return null;
  return session;
}
export async function currentIdentity(headers) {
  const requestOrigin=headers.get('origin');
  if(requestOrigin&&requestOrigin!==configuration().baseURL)throw Object.assign(new Error('FORBIDDEN'),{status:403});
  const session = await sessionFor(headers);
  if (!session) return null;
  if (!mfaVerified(session)) throw Object.assign(new Error('TWO_FACTOR_REQUIRED'), { status: 403 });
  return { userId: session.user.id, email: session.user.email, fullName: session.user.name, displayName: session.user.name };
}
export async function initializeOwner(user) {
  if (user.email.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()) {
    sqlite().prepare("INSERT OR IGNORE INTO config(id,value) VALUES('owner',?)").run(JSON.stringify(user.userId));
  }
}
const verifiedPaths = new Set(['/two-factor/verify-totp', '/two-factor/verify-backup-code']);
const pendingAllowed = new Set([...verifiedPaths, '/get-session', '/sign-out']);
export async function authHandler(request) {
  const service = await authReady();
  const path = new URL(request.url).pathname.replace(/^\/api\/auth/, '');
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length')) > 65536) return Response.json({ message: 'Request too large.' }, { status: 413 });
    const raw = await request.clone().text();
    if (raw.length > 65536) return Response.json({ message: 'Request too large.' }, { status: 413 });
  }
  const session = await sessionFor(request.headers);
  if (session && !mfaVerified(session) && !pendingAllowed.has(path)) {
    return Response.json({ message: 'Complete two-factor authentication first.', code: 'TWO_FACTOR_REQUIRED' }, { status: 403 });
  }
  const response = await service.handler(request);
  if (response.ok && request.method === 'POST' && verifiedPaths.has(path)) {
    // Enrollment and password challenges may rotate the session cookie. Resolve
    // the resulting cookie, then bind MFA proof to that exact server-side session.
    const cookies = new Map((request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(Boolean).map(value => [value.slice(0, value.indexOf('=')), value.slice(value.indexOf('=') + 1)]));
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';')[0], separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const headers = new Headers(request.headers);
    headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const verified = await sessionFor(headers);
    if (verified?.user.twoFactorEnabled) sqlite().prepare('INSERT OR REPLACE INTO _geko_mfa VALUES (?,?)').run(verified.session.id, Date.now());
  }
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
