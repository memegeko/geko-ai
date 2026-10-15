# Verification report

Version: **0.2.0-beta.1**, checked **2026-10-15** with Node.js 24.19.0.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript | Passed. |
| Application, stream, auth, storage, and installer suite | **72 tests passed; 0 failed.** |
| Standalone Next.js production build | Passed. |
| Sites/Vinext build and runtime separation | Passed; platform adapter present and standalone SQLite imports absent. |
| Packaged production HTTP smoke test | Passed, including the same startup entrypoint and traced dependencies used by Docker. |
| Installer shell syntax | Passed. |
| Compose YAML structure | Parsed; persistent volume and loopback-only port checked. |

The application suite runs route handlers with isolated identity and real
in-memory SQLite, while mocking upstream Ollama. The standalone suite runs the
real Better Auth handler and persistent file-backed SQLite in temporary folders.
The installer test simulates Docker commands to check environment generation,
input validation, file permissions, and preserving an existing configuration.
It does not claim that Docker was launched.

## Covered behavior

- Anonymous requests, account-scoped records, shared character visibility,
  owner-only connection configuration, and private group-context boundaries.
- Character create/edit/delete, snapshots, avatars, validation, favorites,
  profiles, personas, lorebooks, explicit memories, and saved chat changes.
- Streaming NDJSON, packet boundaries, UTF-8, progressive grapheme-safe reveal,
  Stop, regeneration alternatives, and errors.
- Two human seats/two AI limit, membership enforcement, invitation rotation,
  concurrent claims/messages, generation locks, and persisted shared replies.
- Standalone invite-only registration, password hashing, configured-admin
  ownership, revoked allowlist access, and rejection of forged platform headers.
- Google/GitHub authorization URL construction and callback paths with test
  credentials; no real provider account is contacted by these tests.
- CSRF-origin rejection and repeated-password-attempt rate limiting.
- Inactive-until-verified TOTP enrollment, encrypted stored secrets, password
  challenges, session-bound MFA gating for simulated social sessions,
  single-use recovery codes, and sign-out.
- Transaction rollback, migration initialization/idempotence, and local storage.
- Installer-generated random secrets, restrictive `.env` permissions,
  noninteractive setup, repeat runs, and safe post-login navigation.

## Production package HTTP check

`pnpm run test:production` stages the exact Next standalone output plus the
files copied by the Dockerfile, then runs its production entrypoint against an
isolated database. It checks:

1. Application pages, login/security pages, logo, and original character artwork.
2. Anonymous rejection, administrator/friend registration, and record isolation.
3. A local HTTP Ollama stub, model discovery, and streamed personal replies.
4. Two-account group joining and a server-persisted group reply.
5. A consistent SQLite online backup.
6. Restarting the production process while retaining the account session and
   saved conversations.

This is server-level testing. It does not certify visual layout or browser
click/keyboard behavior. The same mint/charcoal UI and original assets are kept.

## Not verified in this environment

- A Docker daemon/container build and launch: Docker is unavailable here.
  CI is configured to build the Docker image after the production smoke test.
- Real Google or GitHub account authorization, provider email selection, and
  explicit account linking against a live provider app.
- Real SMTP delivery, email verification, or password-reset emails.
- A physical authenticator app scanning the QR code (TOTP is exercised with
  independently computed codes), or visual accessibility/browser interaction.
- A real home-hosted Ollama model, GPU loading, model quality, proxy buffering,
  public DNS, and HTTPS certificates.
- Migrating production D1 accounts/data to local SQLite; no bulk migration tool
  is claimed.

## Before production rollout

Build/start Compose on the target host, configure HTTPS, register the admin,
configure/test each desired OAuth provider and SMTP, enable and recover from
2FA using a real phone, invite a second account, and exercise a real model.
Verify a backup can be restored on an isolated test instance.
