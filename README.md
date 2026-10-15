<a id="readme-top"></a>

<div align="center">

<img src="public/brand/geko-mark.svg" width="140" alt="geko.ai gecko chat logo">

# geko.ai

### Your characters. Your conversations. Your own little universe.

A self-hosted character-chat application with Ollama inference, private
conversations, personas, lorebooks, explicit memories, and shared group chats.

[![CI](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml)
[![Beta](https://img.shields.io/badge/status-beta-B8EFCE)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-2ea44f)](LICENSE)

[Install](#installation) · [Features](#features) ·
[Authentication](docs/AUTHENTICATION.md) · [Documentation](#documentation) ·
[Report a bug](https://github.com/memegeko/geko-ai/issues)

</div>

---

> [!NOTE]
> Beta software. A model server is required for generated replies. Google and
> GitHub login become available after the administrator supplies OAuth app
> credentials. Password login and authenticator-based 2FA run locally.

<details>
<summary>Table of contents</summary>

- [About](#about)
- [Installation](#installation)
- [Features](#features)
- [Accounts and authentication](#accounts-and-authentication)
- [How it works](#how-it-works)
- [Documentation](#documentation)
- [Project status and limitations](#project-status-and-limitations)
- [Contributing](#contributing)
- [License](#license)

</details>

## About

geko.ai pairs a mint-and-charcoal interface with a model server controlled by
its administrator. Each installation has its own domain, accounts, database,
configuration, and conversations. No ChatGPT account, Sites subscription,
Cloudflare service, or paid inference API is required for standalone hosting.

The application includes eight original starter characters. Custom characters
can stay private or be shared with the installation's invited users.

## Installation

The easiest path is Docker Engine with Docker Compose v2 on a Linux host.
Clone the repository using an account with repository access, then run:

```bash
git clone https://github.com/memegeko/geko-ai.git
cd geko-ai
bash scripts/install.sh
```

The installer asks for the public origin and administrator email, creates a
random authentication secret, writes a protected `.env`, and starts the
application with persistent storage. It preserves existing settings and data
on subsequent runs. Docker must already be installed; the script does not
change the host's package manager or firewall.

For unattended setup:

```bash
bash scripts/install.sh \
  --url https://chat.example.com \
  --admin-email admin@example.com \
  --non-interactive
```

Point an HTTPS reverse proxy at `127.0.0.1:3000`, open the configured domain,
and create an account using `ADMIN_EMAIL`. A Caddy example is included in
[deploy/Caddyfile.example](deploy/Caddyfile.example). For a local-only trial,
use `http://localhost:3000` as the origin.

Read the [self-hosting guide](docs/SELF_HOSTING.md) for Docker, native Node.js,
networking, first-run setup, updates, and troubleshooting.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

| Area | Behavior |
| --- | --- |
| Discovery | Search, categories, original starter characters, and favorites. |
| Character editor | Personality definitions, descriptions, greetings, tags, avatar uploads, and private/shared visibility. |
| Conversations | Saved histories, editing, regeneration, alternatives, ratings, copying, pins, truncation, and JSON export. |
| Streaming | Incremental Ollama responses with a separate character-reveal queue and Stop. |
| Personas | Private profiles selected per conversation or used by default. |
| Lorebooks | Keyword-triggered and always-included world details. |
| Memories | Explicit user-maintained facts associated with a character. |
| Groups | Up to **2 people and 2 AI characters**, room invitations, shared history, and next-speaker selection. |
| Accounts | Email/password, optional Google and GitHub OAuth, explicit provider linking, and sign-out/session management. |
| Two-factor authentication | Authenticator enrollment, sign-in challenges, single-use recovery codes, and account controls. |
| Operations | Automatic schema setup, Docker Compose, a setup script, SQLite backups, and general-purpose deployment documentation. |

Ratings are stored feedback, not model training. Memories are entered
explicitly, not extracted automatically.

## Accounts and authentication

Registration is invite-only. Set `ADMIN_EMAIL` and add other permitted addresses
to `ALLOWED_EMAILS` in `.env`. The configured administrator controls the shared
Ollama connection; another user cannot become the administrator by registering
first.

Password login works without external providers. To enable optional providers,
set the corresponding client ID and secret:

| Provider | Callback URL |
| --- | --- |
| Google | `https://chat.example.com/api/auth/callback/google` |
| GitHub | `https://chat.example.com/api/auth/callback/github` |

Replace the example origin with the installation's `BETTER_AUTH_URL`.
Accounts are not merged automatically because email addresses happen to match.
Sign in first, then use **Settings → Security → Connected login methods** to
connect another provider with the same email.

Users can enable an authenticator in **Settings → Security**. A code must be
verified before enrollment completes. Enabled 2FA also gates application access
after social login. Recovery codes should be stored separately from the server.

SMTP is optional for login, but required for password-reset email and optional
email verification. See [authentication](docs/AUTHENTICATION.md).

## How it works

The standalone server runs Next.js on Node.js 24.15 or newer. Application records,
authentication data, and shared rooms are stored in a persistent SQLite database.
The server contacts Ollama; browsers never receive the gateway bearer token.
LAN and Docker-host Ollama endpoints are supported.

Personal records belong to their authenticated owner. A group has two human
seats and stores its own history. Group prompts use shared messages, selected
characters, pins, and explicitly shared personas. Personal memories and
lorebooks are excluded from group prompts.

A separate adapter retains compatibility with ChatGPT Sites. That hosted mode
continues to use platform-managed identity and D1. Standalone login providers
and SQLite do not alter the authentication of an existing Sites deployment.

See [architecture](docs/ARCHITECTURE.md) and the
[user guide](docs/USER_GUIDE.md) for details.

## Documentation

| Guide | Contents |
| --- | --- |
| [Self-hosting](docs/SELF_HOSTING.md) | Install script, Docker, native Node, reverse proxy, updates, and diagnostics. |
| [Authentication](docs/AUTHENTICATION.md) | Passwords, OAuth apps, invite lists, account linking, 2FA, and email. |
| [Configuration](docs/CONFIGURATION.md) | Environment variables and persistence. |
| [User guide](docs/USER_GUIDE.md) | Characters, chats, personas, lorebooks, memories, and groups. |
| [Ollama](docs/OLLAMA.md) | Local and remote inference connections. |
| [Architecture](docs/ARCHITECTURE.md) | Runtime adapters, requests, storage, identity, and streaming. |
| [Backup and recovery](docs/BACKUP_RESTORE.md) | Consistent SQLite backups, restore, and secrets. |
| [Development](docs/DEVELOPMENT.md) | Local development and checks. |
| [Testing](docs/TESTING.md) | Verified behavior and outstanding checks. |
| [Security](SECURITY.md) | Deployment boundaries and reporting. |

## Project status and limitations

- Beta release; read the testing report before production use.
- SQLite hosting supports one application instance on one host. Shared network
  filesystems and horizontal replicas are not supported.
- Google/GitHub require provider registration, credentials, and matching callback
  URLs. The installer cannot create those external registrations.
- Group updates use polling; there is no WebSocket service.
- Voice calls, image generation, automatic memory extraction, and Character.AI
  data import are not implemented.
- Model quality, response speed, context retention, and consistency depend on
  Ollama, the selected model, and hardware.
- Existing Sites data is not silently migrated into a standalone installation.
  See the backup guide for the current migration boundary.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Include reproduction steps and relevant
checks. Never include private conversations, OAuth secrets, session cookies,
or database backups in an issue or pull request.

## License

Project code is distributed under the [MIT License](LICENSE). Third-party
notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

geko.ai is independent of Character.AI, Google, GitHub, Microsoft, Ollama, and
OpenAI. Product names and trademarks belong to their respective owners.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
