# Changelog

## 0.2.0-beta.2 — 2026-10-16

- Made self-hosting the only supported runtime; removed obsolete platform build,
  authentication, connector, and starter scaffolding and unused dependencies.
- Grouped website/server code under `src/`, SQL under `database/`, and server
  helpers under `scripts/`.
- Added a downloadable one-line installer with a whiptail terminal wizard,
  host dependency setup, configuration validation, protected random secrets,
  Docker build/start, and persistent application/model volumes.
- Added local Ollama with model download now/later, external Ollama mode,
  CPU/automatic/NVIDIA selection, toolkit setup, and first-start connection setup.
- Added resumable downloads and explicit upgrades with backups and preservation
  of existing configuration and owner-saved AI settings.
- Updated self-hosting documentation, regression tests, and container CI.

## 0.2.0-beta.1 — 2026-10-15

- Added standalone Docker hosting with SQLite, invite-only email/password and
  optional Google/GitHub login, TOTP 2FA, account linking, recovery, and sessions.
- Added online backups, authentication tests, and production HTTP verification.

## 0.1.0-beta.1 — 2026-10-15

- Initial character chats, personas, lorebooks, memories, streaming replies,
  shared groups, original branding, and application regression coverage.
