# Development

## Standalone setup

Use Node.js ≥24.15.0 and pnpm 11.25.0:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Set localhost origin, admin email, a fresh random auth secret, and optional providers.
pnpm run db:migrate
pnpm dev
```

A clean clone uses the standalone Next.js runtime at `http://localhost:3000`.
There is no mock sign-in in standalone mode. Register a permitted account.
Application and auth tables are initialized by the migration helper or by
production startup; auth requests also wait for schema initialization.

```bash
pnpm run typecheck
pnpm test
pnpm run build:selfhost
```

Tests use separate temporary SQLite databases and mock upstream Ollama replies.
They do not modify production records. Production builds use `.next-selfhost`.
The installer's Docker image runs the standalone Next server as a non-root user.

## Runtime adapters

`@geko/platform` is resolved by the standalone build to
`lib/selfhost/platform.ts`; Vite resolves it to `lib/platform.ts` for Sites.
Keep platform identity and database calls behind this adapter. The API tests
compile the Sites adapter against isolated identity and database mocks. The
self-host tests use the real Better Auth handler and a real local database.

`app/chatgpt-auth.ts` is retained for Sites compatibility only. Standalone
requests never treat its headers as authenticated identity.

## Schema and versioning

Application SQL lives in `drizzle/`. Add new numbered migrations; do not modify
an applied migration. The standalone loader stores and verifies checksums.
Better Auth migrations are derived from the pinned library and plugins; run
backup/upgrade checks when changing the auth dependency or plugin configuration.

## Source layout

Read [Architecture](ARCHITECTURE.md) for the module map. New UI should preserve
the existing mint/charcoal styling, responsive layouts, streaming, and privacy
boundaries. Keep SQLite transactions short and do not perform network requests
inside a transaction.

## Sites development and publication

Managed Sites checkouts retain the supplied execution profile, source helper,
Vite integration, project identity, D1 binding, and private deployment policy.
`pnpm build` selects that existing managed build there; `build:selfhost` always
selects the standalone build. The local auth UI redirects to platform sign-in
when running under the Sites adapter. The security screen is standalone only.

Do not commit `.env`, runtime profiles, local databases, generated output,
credentials, backup files, or another installation's project identity to a
portable source distribution. The GitHub hosting manifest contains binding
shape only. An existing managed checkout keeps its real project ID locally.
