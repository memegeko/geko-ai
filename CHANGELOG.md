# Changelog

## 0.2.0-beta.1 — 2026-10-15

- Added independent Node.js/SQLite hosting with automatic schema setup.
- Added Docker Compose, a repeatable installer, health checks, and online backups.
- Added email/password, Google and GitHub OAuth, explicit provider linking,
  authenticator enrollment, recovery codes, password recovery, and session controls.
- Gated password and social sessions behind enabled second-factor verification.
- Restricted registration to configured invited email addresses; administrator
  ownership no longer depends on which invited user registers first.
- Retained the existing UI and Sites adapter while supporting private Ollama URLs
  in standalone installations.
- Replaced instance-specific documentation with deployment, configuration,
  authentication, user, architecture, and recovery guides.

## 0.1.0-beta.1 — 2026-10-15

Initial Beta source release of the independent geko.ai project by memegeko.

### Included

- Mint and charcoal interface, original gecko chat-bubble logo, and eight
  original starter characters.
- Character discovery, creation, private or shared visibility, uploaded avatars,
  and saved favorites.
- Account-specific conversations, personas, lorebooks, and explicit memories.
- Progressive Ollama replies, Stop, edit, regenerate, alternate replies, ratings,
  copy, pin, truncate, and JSON export.
- Shared rooms limited to two human members and two AI characters, with
  revocable invitations, server-side membership checks, shared history,
  incremental updates, and next-speaker selection.
- Owner-only Ollama model discovery and gateway configuration, with bearer
  tokens retained on the server.
- Runtime record validation and regression coverage for saved data, account
  boundaries, concurrent group operations, and stream handling.
- Project documentation, MIT license, and CI workflow.

### Follow-up fixes

- Preserve group reply text already visible between database saves when Stop is
  pressed, while retaining prefix validation and the stopped-generation guard.
- Prevent personal chat metadata and feedback changes during active generation
  from being overwritten by the completed reply save.

### Verification

The Node test suite, TypeScript check, and production build are part of the
release check. Exact results and outstanding manual checks are recorded in
[`docs/TESTING.md`](docs/TESTING.md).

### Release boundaries

This is source for a Sites/Cloudflare Workers application. The hosted app
remains private and uses ChatGPT sign-in. Google OAuth and standalone Docker
hosting are not implemented. Browser end-to-end behavior and a real home
Ollama connection are not certified by this Beta release.
