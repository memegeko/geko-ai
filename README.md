<a id="readme-top"></a>

<div align="center">

<img src="public/brand/geko-mark.svg" width="140" alt="geko.ai gecko chat logo">

# geko.ai

### Your characters. Your conversations. Your own little universe.

An independent character-chat application by **memegeko**, with
home-hosted Ollama inference, persistent conversations, personas, lorebooks,
and shared groups for you and a friend.

[![CI](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/memegeko/geko-ai/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-0.1.0--beta.1-B8EFCE?style=for-the-badge&labelColor=17251D)](CHANGELOG.md)
[![Ollama](https://img.shields.io/badge/inference-Ollama-eeeeee?style=for-the-badge&logo=ollama&logoColor=white&labelColor=25252A)](https://ollama.com/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-66B8FF?style=for-the-badge)](LICENSE)

[**Open geko.ai**](https://geko-ai.meme-geko.chatgpt.site/) ·
[**Features**](#features) ·
[**Setup**](#installation-and-development) ·
[**Connect Ollama**](docs/OLLAMA.md) ·
[**memegeko**](https://github.com/memegeko)

</div>

---

> [!IMPORTANT]
> **This is a Beta source release.** The current hosted application is private
> and uses Sign in with ChatGPT. Friends need a Site invitation before they can
> join a shared group. AI replies require a separately configured Ollama server;
> no model, inference credits, or demo replies are included.

> [!NOTE]
> Automated tests and the production build have been checked. Browser-based
> end-to-end testing and inference against a real home-hosted Ollama model remain
> unverified. See the [testing report](docs/TESTING.md) for the exact scope.

<details>
<summary>Table of contents</summary>

- [Meet geko.ai](#meet-gekoai)
- [Features](#features)
- [Accounts and shared groups](#accounts-and-shared-groups)
- [Installation and development](#installation-and-development)
- [Connect your home AI](#connect-your-home-ai)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [License and independence](#license-and-independence)

</details>

## Meet geko.ai

geko.ai brings character conversations into a space you control. Discover an
original character, create your own, introduce a persona, and keep the details
of your world in a private lorebook. Replies stream progressively as your
configured Ollama model generates them.

The interface uses mint green and charcoal, original character artwork, and a
gecko chat-bubble identity. Roleplay characters and everyday assistants live in
the same discovery view. This is an independent application inspired by the
character-chat format, not a fork of Character.AI or a claim to reproduce its
proprietary models.

## Features

| Area | Implemented behavior |
| --- | --- |
| **Discover** | Search, category filters, eight original starter characters, and saved favorites. |
| **Create** | Character descriptions, greetings, personality definitions, tags, avatar uploads, and private or space-shared visibility. |
| **Conversations** | Persistent personal chats, editing, reply alternatives, ratings, copying, pinned context, truncation, and JSON export. |
| **Progressive replies** | Stream decoding, a separate character-reveal queue, typing indicators, grapheme-safe text, and Stop without revealing an unseen tail. |
| **Personas** | Private persona profiles, a default for new personal chats, and explicit persona selection inside each conversation. |
| **Lorebooks** | Enabled entries selected by recent-message keywords, plus optional always-included entries. |
| **Memories** | Explicit, user-maintained facts carried into personal chats with a chosen character. |
| **Shared groups** | At most **2 people, including the creator, and 2 AI characters**, with invitations, shared messages, incremental updates, and next-speaker selection. |
| **Ollama connection** | Owner-only gateway configuration, model discovery, server-side bearer tokens, creativity, and context-window settings. |

Ratings are saved feedback; they do not train or fine-tune your model.
Memories are maintained explicitly rather than extracted automatically.

## Accounts and shared groups

Personal conversations, profiles, favorites, personas, lorebooks, and memories
are scoped to the authenticated account. Characters marked **Shared** are
visible to people admitted to the private Site.

For a shared group:

1. Open **Chats > New group chat** and choose one or two AI characters.
2. Copy the group's invitation link and share it with one friend.
3. Admit that friend through the Site's native **Share** controls if necessary.
4. Your friend opens the link and chooses **Join group**.
5. Send messages, select an AI, and choose **Reply** when you want it to speak.

The second human seat is claimed atomically. A third person is refused, even
with the invitation link. A room accepts one AI generation at a time. Both
people retain their own accounts; a shared room does not expose their personal
chat histories.

Shared prompts contain the room's messages, pinned context, chosen character
definitions, and personas explicitly selected for that group. **Private
memories and lorebooks are not included.** Selecting a private character for a
group shares its saved definition with that group's other member.

## Installation and development

The supported production target is **ChatGPT Sites with Cloudflare Workers
and D1**. This source release does not provide standalone Docker hosting or
Google OAuth. Local development uses the starter's loopback-only simulated
ChatGPT sign-in; production identity remains platform-managed.

Requirements:

| Dependency | Requirement |
| --- | --- |
| Node.js | **24.x** for the application and the SQLite-backed test suite |
| pnpm | **11.25.0**, pinned in `package.json` |
| Hosted storage | Cloudflare D1, binding `DB`, provisioned through Sites |
| AI inference | A separately installed Ollama model behind a reachable HTTPS gateway |

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

Apply the included migrations to the local D1 database before starting a
fresh development session. The [development guide](docs/DEVELOPMENT.md) has
the exact commands, local sign-in details, and deployment boundaries.

To open the local development app afterward:

```bash
pnpm dev
```

## Connect your home AI

1. Install Ollama on your machine and pull a suitable model.
2. Forward `/api/tags` and `/api/chat` through an authenticated HTTPS gateway.
3. Open **Settings** in geko.ai, enter the gateway URL and optional bearer token,
   test the connection, select a model, and save.

The hosted Worker makes inference requests. A LAN address or Tailscale-only
hostname is insufficient unless made reachable through a supported gateway.
Browser CORS changes are not needed. Gateway tokens are stored server-side and
are never returned to the browser.

Until configured, the app saves messages and shows an explicit connection
notice. It does not fabricate AI responses. See [Ollama setup](docs/OLLAMA.md).

## Documentation

| Topic | Guide |
| --- | --- |
| Local setup, migrations, and source layout | [Development](docs/DEVELOPMENT.md) |
| Gateway configuration and connection troubleshooting | [Ollama](docs/OLLAMA.md) |
| Automated coverage and verification limits | [Testing](docs/TESTING.md) |
| Beta release changes | [Changelog](CHANGELOG.md) |
| Bug reports and contributions | [Contributing](CONTRIBUTING.md) |
| Third-party code and artwork | [Notices](THIRD_PARTY_NOTICES.md) |

## Known limitations

- The private hosted Site uses ChatGPT sign-in and native Site invitations.
  Independent Google login is not implemented.
- Shared rooms poll for updates about every 1.2 seconds while visible. They are
  not a WebSocket service; the person requesting an AI reply receives its token
  stream directly.
- Existing personal multi-character conversations stay personal. Create a new
  shared group to invite a friend.
- Voice calls, speech recognition, image generation, automatic memory
  extraction, and Character.AI data imports are not implemented.
- Reply quality, latency, context retention, and character consistency depend
  on your Ollama model, prompts, hardware, and gateway.
- Live browser interaction, real two-account browser sessions, and a real
  home-model connection require further verification before a stable release.

## Contributing

Focused bug reports, tested fixes, accessibility improvements, and clear
character-authoring documentation are welcome. Include the app version,
browser, reproduction steps, expected behavior, and relevant test results.
Keep private conversations, gateway tokens, and account identifiers out of
public reports. See [Contributing](CONTRIBUTING.md).

## License and independence

Project code is available under the [MIT License](LICENSE). Vendored source
and dependency notices are preserved in their original files and summarized
in [Third-party notices](THIRD_PARTY_NOTICES.md).

geko.ai is an independent project. It is not
affiliated with or endorsed by Character.AI, Google, Microsoft, or Ollama.
Names and trademarks belong to their respective owners. No Character.AI
models, proprietary interface assets, or chat datasets are redistributed.

---

<div align="center">

### <sub>YOUR CHARACTERS · YOUR AI · OPEN DEVELOPMENT</sub>

[memegeko](https://github.com/memegeko) ·
[geko.ai](https://geko-ai.meme-geko.chatgpt.site/) ·
[Documentation](docs/DEVELOPMENT.md)

</div>

<p align="right">(<a href="#readme-top">back to top</a>)</p>
