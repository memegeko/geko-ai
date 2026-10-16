# Development

Use Node.js **24.15+** and **pnpm 11.25.0**. The application uses Node's built-in
SQLite driver. Production dependencies are installed in Docker.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Set a random BETTER_AUTH_SECRET, ADMIN_EMAIL, and BETTER_AUTH_URL.
# For native local Ollama set OLLAMA_URL=http://127.0.0.1:11434.
pnpm run db:migrate
pnpm dev
```

Next loads `.env` for dev/start. The migration helper explicitly loads it.
Application/authentication tables are initialized on server startup or the first
authenticated request. The AI endpoint is seeded only if no connection is saved.

## Checks

```bash
bash -n install.sh
pnpm run typecheck
pnpm test
pnpm run build
pnpm run test:production
```

`src/app` contains UI/API routes; `src/lib` contains server helpers, local auth,
SQLite, prompt/context construction, and stream handling. `@geko/platform` is a
TypeScript path alias to `src/lib/platform.ts`. There is one Next.js runtime.

Route tests compile source against a test identity and real in-memory SQLite.
Authentication tests use Better Auth and a temporary SQLite file. The production
smoke test stages the traced Next output and exercises the same entrypoint as
the Docker image through real HTTP, using a local Ollama stub.

## Database changes

Schema: `database/schema.ts`. SQL and Drizzle snapshots: `database/migrations/`.
Use `pnpm run db:generate` to append a migration. Applied SQL is checksum-checked
and immutable. Auth tables are managed by Better Auth. Back up before changes.

The query wrapper uses prepared statements, `.bind()`, `.first()`, `.all()`,
`.run()`, and transactional `.batch()`. It is implemented by local SQLite and
has no external database service dependency.
