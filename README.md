<div align="center">
<img src="public/brand/geko-mark.svg" width="112" alt="geko.ai gecko logo">

# geko.ai

**Your characters. Your conversations. Your server.**

Private character chats and shared AI groups, powered by your own Ollama models.

[![CI](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-B8EFCE)](LICENSE)

[Installation](#install-with-one-command) · [Server guide](docs/SELF_HOSTING.md) · [Accounts](docs/AUTHENTICATION.md) · [Ollama](docs/OLLAMA.md)
</div>

## Install with one command

Run on your **Linux server** over SSH:

```bash
curl -fsSL https://raw.githubusercontent.com/memegeko/geko-ai/main/install.sh | sudo bash
```

Already root? Replace `sudo bash` with `bash`. You need curl to download the
installer; it installs the remaining host dependencies. The terminal wizard uses
arrow keys, Tab, and Enter, with a text fallback on minimal terminals.

The wizard asks for your site address, administrator email, model, and hardware.
It downloads the source into `/opt/geko-ai`, installs Docker/Compose when missing,
builds the site, runs database migrations, generates a private authentication
secret, starts persistent services, and configures the AI connection.

| AI choice | What gets installed |
| --- | --- |
| **Install and download** | Site + local Ollama + selected model weights. |
| **Download later** | Site + local Ollama, with no model weights downloaded. |
| **Existing Ollama** | Site connected to your existing endpoint; no local Ollama or model download. |

The default model tag is `qwen3:8b`; you can choose another. Model resource needs
vary: check available RAM, VRAM, and disk space before choosing a large model.
CPU inference is supported. NVIDIA mode sets up the container toolkit when
needed; a working NVIDIA host driver must already be installed.

**Access:** for an HTTPS domain, point your existing reverse proxy at
`127.0.0.1:3000`. For a server without a domain, choose `http://localhost:3000`
and connect from your computer with:

```bash
ssh -L 3000:127.0.0.1:3000 user@your-server
```

Then open **http://localhost:3000**, choose **Create an invited account**, and
register using the administrator email you entered. You choose your password
in the browser. Optional Google/GitHub login needs your own OAuth credentials.

### Install without downloading a model

```bash
curl -fsSL https://raw.githubusercontent.com/memegeko/geko-ai/main/install.sh | sudo bash -s -- --skip-model
```

To download it later:

```bash
cd /opt/geko-ai
sudo docker compose exec ollama ollama pull qwen3:8b
```

### Unattended setup

```bash
curl -fsSL https://raw.githubusercontent.com/memegeko/geko-ai/main/install.sh | sudo bash -s -- \
  --non-interactive --url https://chat.example.com \
  --admin-email you@example.com --model qwen3:8b --gpu cpu
```

Use `--ollama-url http://192.168.2.20:11434` to reuse a model server, `--dir` to
choose a folder, or `--help` for every option. `--skip-start` writes and validates
configuration without starting containers. `--no-deps` uses an existing Docker
installation and does not change host packages.

## What you get

- Mint and charcoal character discovery, original starter characters, search,
  favorites, custom characters, and avatar uploads.
- Persistent personal chats, streaming replies, Stop, editing, alternatives,
  ratings, pinned context, and conversation JSON export.
- Personas, keyword-triggered lorebooks, and explicit character memories.
- Shared groups for **two people and up to two AI characters**, with invitations
  and server-persisted replies. Personal lorebooks and memories stay private.
- Invite-only email/password accounts, optional Google/GitHub login, TOTP 2FA,
  recovery codes, and session management. SMTP enables email recovery.
- Local SQLite, online backups, persistent model storage, and automatic restart.

## Manage your server

Run these in `/opt/geko-ai`:

| Task | Command |
| --- | --- |
| Service status | `sudo docker compose ps` |
| Follow logs | `sudo docker compose logs -f` |
| Stop | `sudo docker compose stop` |
| Start | `sudo docker compose up -d --wait` |
| Upgrade with a backup | `sudo bash install.sh --update --non-interactive` |

Rerunning the installer preserves `.env`, the database, saved AI settings, and
model weights. Updates refuse to overwrite edited tracked files. A failed
model pull can be resumed by rerunning the installer.

## Repository layout

| Path | Contents |
| --- | --- |
| `install.sh` | Downloadable server installer and terminal wizard. |
| `compose.yaml`, `Dockerfile` | Site and optional Ollama services. |
| `src/app/` | Website, login/security pages, and API routes. |
| `src/lib/` | Authentication, SQLite storage, prompts, and streaming. |
| `database/` | Schema and immutable SQL migrations. |
| `scripts/` | Startup, migration, backup, and production verification. |
| `deploy/` | NVIDIA Compose override and reverse proxy example. |
| `public/` | Logo, icons, and character artwork. |
| `tests/`, `docs/` | Automated checks and self-hosting documentation. |

## Documentation

[Server setup](docs/SELF_HOSTING.md) · [Configuration](docs/CONFIGURATION.md) ·
[Authentication](docs/AUTHENTICATION.md) · [Ollama](docs/OLLAMA.md) ·
[Backup and restore](docs/BACKUP_RESTORE.md) · [User guide](docs/USER_GUIDE.md) ·
[Development](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Verification](docs/TESTING.md)

This is beta software. Actual model quality and speed depend on your hardware
and chosen model. Voice, image generation, automatic memory extraction, and
Character.AI imports are not implemented.

Project code is [MIT licensed](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md).
geko.ai is an independent project by [memegeko](https://github.com/memegeko),
with no affiliation to Character.AI or model providers.
