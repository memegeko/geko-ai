# Development

geko.ai uses React, TypeScript, Vinext, Cloudflare Workers, and D1. Sites
manages production identity, private-site access, runtime resources, and
publication. A normal GitHub clone starts in the portable development profile.

## Install and check

Install Node.js 24.x and pnpm 11.25.0, then run:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

Use the pinned pnpm version and lockfile. The managed authoring environment's
`install:ci` wrapper is not needed for an ordinary clone or GitHub Actions.

## Prepare local storage

The hosting manifest declares D1 as `DB`. The build emits
`dist/server/wrangler.json`, which points Wrangler at the local binding. Apply
migrations in order, exactly once per local database:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_silly_ultimatum.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_cute_whirlwind.sql
```

Local storage is separate from the hosted D1 database. Tests use their own
in-memory SQLite database and do not modify either local preview data or
production records.

After schema edits, run `pnpm run db:generate`, inspect the generated migration,
and append it after the existing migrations. Do not edit an applied migration.

## Run locally

```bash
pnpm dev
```

The portable development server normally uses `http://localhost:5173`. Open
`/signin-with-chatgpt?return_to=/` on that loopback server to sign in with the
starter's local simulated identity. This development identity is not a
production account or an external OAuth implementation.

The first authenticated visitor initializes the app owner. On a newly hosted
Site, open it while it is still owner-private before inviting other people.
Only the app owner can change the Ollama gateway configuration.

Managed authoring sessions use their supplied Sites preview and build helpers.
Keep `.sites-runtime/`, `.wrangler/`, `.git/`, environment files, and databases
out of published source.

## Source layout

| Path | Purpose |
| --- | --- |
| `app/geko-app.tsx` | Discovery, editors, personal chats, shared groups, and settings. |
| `app/api/data/` | Account-scoped persistent records. |
| `app/api/connection/` | Owner-only gateway test and configuration. |
| `app/api/generate/` | Personal-chat Ollama streaming. |
| `app/api/groups/` | Shared-room membership, messages, and streaming. |
| `lib/validation.ts` | Record validation at the API boundary. |
| `lib/reply-stream.ts` | NDJSON decoding and progressive text reveal. |
| `lib/prompt.ts` | Character, persona, lore, memory, and message context. |
| `db/` and `drizzle/` | Schema declarations and immutable applied migrations. |
| `public/brand/` | Vector identity and home-screen icon. |
| `tests/` | SQLite-backed API tests and streaming/reveal tests. |

## Publication

The supported production flow is Sites registration, source synchronization,
build packaging, saved version, and private deployment. Retain an existing
Site's identity and access policy when updating it. A public source checkout
must not inherit another installation's `project_id`; registration supplies a
new identity for a new Site.

GitHub publication distributes source and documentation. It does not grant
access to the private hosted app, create a model server, or provision a
standalone Docker deployment. Google OAuth is not implemented in this version.
