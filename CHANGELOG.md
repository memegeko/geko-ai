# Changelog

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
