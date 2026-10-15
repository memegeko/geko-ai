# Authentication and account security

Standalone authentication uses Better Auth with persistent SQLite storage.
Passwords are hashed by the library. Session cookies are HttpOnly, use the
same-site policy supplied by Better Auth, and are Secure on HTTPS origins.
The app does not trust incoming ChatGPT identity headers in standalone mode.

## Administrator and invited users

Set `ADMIN_EMAIL` before the first start. Create that account through `/login`.
Only a successful authenticated account with that email can initialize the
application owner. A different invited user registering first cannot take it.

Add comma-separated email addresses to `ALLOWED_EMAILS` and recreate the
container. Provider credentials and passwords do not override this allowlist.
Removing an address denies existing application sessions and future logins
for it. This does not erase the user's records or past group messages.
Changing `ADMIN_EMAIL` is not an automatic ownership-transfer tool: the saved
owner is initialized once. Back up and plan an explicit migration for a
transfer, rather than editing account IDs casually.

## Email and password

Use **Create an invited account** on `/login`. Passwords must contain 12–128
characters. The sign-in page supports email/password login and handles a
subsequent authenticator challenge when enabled.

Email verification is optional. Set up SMTP and set
`REQUIRE_EMAIL_VERIFICATION=true` to require it. Enabling that option without
SMTP causes startup to fail rather than creating accounts nobody can verify.
SMTP also enables **Forgot password?**. Reset links expire according to Better
Auth's configured defaults; a successful reset revokes existing sessions.
Without email delivery, there is no password-reset email fallback.

## Google OAuth

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure its OAuth consent screen, permitted audience, and test users as
   required for the provider app's publication status.
3. Create a **Web application** OAuth client.
4. Set its authorized redirect URI to
   `https://chat.example.com/api/auth/callback/google`.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
6. Recreate the application container and test with an allowed Google email.

For local development the callback can use `http://localhost:3000` with the
same path. Use separate credentials when separating development and production.

## GitHub OAuth

1. Open [GitHub Developer Settings](https://github.com/settings/developers).
2. Create an **OAuth App** with the installation origin as its homepage.
3. Set its callback to `https://chat.example.com/api/auth/callback/github`.
4. Put its client ID and secret into `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET`.
5. Recreate the container and test with an invited GitHub email address.

Do not use a repository personal access token as the OAuth client secret.
A GitHub OAuth App normally has one callback URL; separate environments may
need separate apps. An address selected by the provider must match an invited
address on this installation.

## Connect multiple login methods

A provider button appears only when both credentials for that provider exist.
Accounts with matching emails are **not** automatically merged at sign-in.
Sign into the existing account, complete any 2FA challenge, then use
**Settings → Security → Connected login methods**. The provider's email must
match the account. Do not create duplicate accounts to transfer chats.

A social-only user can set up an authenticator without adding a local
password. Password-account security changes require the existing password.
To add a local password to a social-only account, use the password-reset flow;
this requires configured SMTP delivery.

## Authenticator-based 2FA

1. Open **Settings → Security & two-factor authentication**.
2. Enter the current password for a password account. Social-only accounts
   can leave it blank.
3. Choose **Set up authenticator** and scan the QR code in a TOTP app.
4. Save the recovery codes separately from the server.
5. Enter a valid authenticator code to finish enrollment.

Enrollment is inactive until the code is verified. The library encrypts the
stored TOTP secret and backup codes using the authentication secret. Keep that
secret with encrypted backups; losing it can make 2FA material unusable.

For password login, the library withholds a session until verification. Social
providers establish their own login first; the application then requires its
own TOTP or recovery-code verification before granting chat/API access. This
proof is stored against the exact server-side session ID. A pending social
session cannot disable 2FA, change a password, or link another provider.

Recovery codes are single use. **Replace recovery codes** invalidates the old
set. **Disable 2FA** requires a completed sign-in plus the password when the
account has one. A revoked or newly created session does not inherit another
session's verification. Trusted-device bypass is not exposed by the UI.

## Email delivery

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASSWORD="your-mail-password"
MAIL_FROM="geko.ai <mailer@example.com>"
REQUIRE_EMAIL_VERIFICATION=false
```

Port 465 uses implicit TLS; other ports require STARTTLS. Configure the mail
provider's sender permissions and DNS as appropriate. Secrets stay in `.env`;
login and reset emails must not be logged as a substitute for delivery.

## Sessions and abuse controls

**Security → Active sessions** lists signed-in devices and supports revocation.
Password changes can revoke other sessions. The default session lifetime is
seven days. Logout deletes the authenticated session.

Authentication and second-factor endpoints use persisted rate limiting. A
trusted reverse proxy must replace client-supplied forwarded headers. Without
a usable client IP the library uses a shared per-path bucket, which is safer
than disabling limits but may throttle multiple users together.

The Sites adapter keeps its existing platform-managed identity; these local
OAuth and password settings apply only to a standalone installation.

References: [Better Auth SQLite](https://better-auth.com/docs/adapters/sqlite),
[2FA](https://better-auth.com/docs/plugins/2fa),
[account linking](https://better-auth.com/docs/concepts/users-accounts).
