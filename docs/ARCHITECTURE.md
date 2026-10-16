# Architecture

## Standalone request path

1. A browser loads the existing React character-chat interface from Next.js.
2. Authentication endpoints delegate password/OAuth/TOTP operations to Better
   Auth. Provider callbacks terminate on this installation.
3. The standalone platform adapter validates the session, invited email, and
   session-specific second-factor proof before protected application routes run.
4. Application routes use their existing prepared-query interface; a small
   adapter implements it against Node's built-in SQLite driver.
5. The server assembles character/persona/context prompts and calls Ollama.
6. NDJSON tokens stream to the browser. A separate grapheme-aware queue reveals
   the text progressively. Stop retains the visible text.

There is no mandatory external identity service, database service, or inference
provider in the standalone path. Google/GitHub are optional external identities.

## Server runtime

One standalone Next.js server handles UI and API routes. `@geko/platform`
resolves to `src/lib/platform.ts`, which uses local Better Auth sessions and
SQLite. `src/lib/bootstrap.mjs` seeds an absent AI connection from installer
variables without overwriting settings saved by the owner.

Compose runs the site and optionally Ollama on a private network. Application
and model data use separate named volumes. The NVIDIA override reserves GPU
devices for local Ollama. The app does not publish the Ollama API to the host.

## Stored data

| Store | Contents |
| --- | --- |
| `records` | Account-owned characters, personal chats, personas, lorebooks, memories, and profile JSON. |
| `config` | Saved owner identity and shared inference settings. |
| `group_rooms` | Owner/guest seats, invitation, character snapshots, explicit group personas, generation lock. |
| `group_messages` | Shared messages with authenticated authors and ordering. |
| Better Auth tables | Users, password hashes, providers, sessions, verification records, 2FA, and rate-limit state. |
| `_geko_migrations` | Applied application migration names and checksums. |
| `_geko_mfa` | Successful second-factor proof bound to a server session. |

Application migrations run transactionally. SQLite uses WAL, foreign keys,
a busy timeout, and restrictive file permissions. Group seat claims and
response-generation locks use conditional SQL updates to avoid double claims.

## Context and privacy

Personal prompts include the selected character, active persona, keyword or
always-included lore, character memories, pins, and up to 60 recent messages.
Lore keyword matching examines the last 12 messages. Very large context may
still be truncated by the model's selected context window.

Shared prompts omit private lorebooks and memories. Each participant must
explicitly select a persona to share its name and description. Choosing a
private character for a shared room shares its snapshot with that room.

Group updates poll about every 1.2 seconds while the page is visible. The
requester receives the live stream; the other participant reads persisted
increments. This is not a distributed real-time messaging service.

## Authentication details

The login adapter marks successful TOTP/recovery verification against the
resulting session ID, including session rotations during enrollment. This
additional gate covers OAuth sessions as well as password challenges. Pending
MFA sessions may verify or sign out; they cannot modify security settings.

## Main code locations

| Location | Responsibility |
| --- | --- |
| `src/app/geko-app.tsx`, `src/app/globals.css` | Existing product UI and editors. |
| `src/app/login`, `src/app/security` | Standalone sign-in and account security. |
| `src/app/api/auth`, `src/app/api/account` | Auth transport/config and account state. |
| `src/lib/auth.mjs` | Auth options, invite policy, MFA application gate. |
| `src/lib/storage.mjs` | Local SQLite and transactional prepared-query adapter. |
| `src/lib/server.ts`, `src/app/api/*` | Account-scoped records, settings, groups, generation. |
| `src/lib/prompt.ts`, `src/lib/reply-stream.ts` | Context assembly and progressive streaming. |
| `Dockerfile`, `compose.yaml`, `install.sh` | Standalone operations. |
