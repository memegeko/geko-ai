# Self-hosting geko.ai

## Choose a deployment

| Method | Requirements | Start command |
| --- | --- | --- |
| Docker Compose (recommended) | Linux, Docker Engine, Compose v2, Git | `bash scripts/install.sh` |
| Native Node | Node.js ≥24.15, pnpm 11.25.0, Git | See below |

A server with 2 CPU cores and 2 GB RAM is a practical starting point for the
web app; builds may need more memory. The model runs separately and needs its
own resources. No hosted authentication or storage subscription is required.
SQLite means this is a single-instance deployment, not a replicated cluster.

## Docker installation

1. Install Docker Engine and the Compose v2 plugin using the
   [Docker installation instructions](https://docs.docker.com/engine/install/).
2. Clone this repository. Private repository access requires a GitHub account
   with permission and working Git authentication.
3. Run `bash scripts/install.sh` from the clone.
4. Supply the origin, for example `https://chat.example.com`, and the
   administrator's email. Use an origin without a path or trailing route.
5. Configure DNS and an HTTPS reverse proxy.
6. Open `/login` and create an account matching `ADMIN_EMAIL`.
7. Configure Ollama in Settings, then add invited email addresses and optional
   provider credentials in `.env`.

The script validates its inputs, generates a 256-bit random secret, sets `.env`
to mode 600, and runs `docker compose up -d --build --wait`. It does not install
Docker, request root, create DNS records, obtain provider credentials, or alter
firewall rules. A repeated run preserves `.env` and the database volume.
Use `--skip-start` to create configuration without starting containers.

```bash
bash scripts/install.sh --url https://chat.example.com \
  --admin-email admin@example.com --port 3000 --non-interactive
```

Compose binds the web port to loopback only. The application runs as the
non-root `node` user. Data lives in the `geko-data` named volume. Ordinary
`docker compose down` preserves it; **`down -v` deletes it**.

## HTTPS and reverse proxies

For Caddy running directly on the host:

```caddy
chat.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Use the same origin for DNS, `BETTER_AUTH_URL`, and OAuth callbacks. Forward
`Host`, the scheme, and a trusted client IP. Replace incoming forwarded IP
headers at the proxy so clients cannot choose their rate-limit identity.
Do not expose the application port around the proxy. Do not cache `/api/*` or
buffer streamed chat responses. If a proxy has a request timeout, allow at
least 130 seconds for model loading and inference.

For an Nginx proxy, set `proxy_buffering off`, `proxy_read_timeout 130s`, and
appropriate `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers. Support
JSON request bodies of at least 2 MB for avatars. If the proxy runs in Docker,
use a private Docker network instead of exposing the app publicly; loopback
inside a proxy container is that container, not the host.

HTTP is accepted only for loopback development such as
`http://localhost:3000`. Use HTTPS for LAN or internet clients. For a local
installation on a remote machine, use an SSH port forward or configure HTTPS.

## Native Node.js installation

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env: origin, admin email, and a fresh random authentication secret.
node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
pnpm run db:migrate
pnpm run build:selfhost
node --env-file=.env node_modules/next/dist/bin/next start --hostname 127.0.0.1
```

The secret-generation command displays a newly generated secret only. Paste
it into `.env`; do not commit it. Protect `.env` with `chmod 600 .env`.
Use a process supervisor under a dedicated unprivileged service account with
the repository as its working directory. Next reads `.env` automatically;
`--env-file` makes the native production configuration explicit. The native
data path defaults to `./data/geko.sqlite`.

## Configure friends and providers

Edit `ALLOWED_EMAILS`, OAuth credentials, or SMTP in `.env`, then recreate:

```bash
docker compose up -d
```

Adding an email allows that address to register; it does not send an invitation
email. Share the installation URL separately. For exact Google/GitHub setup
and TOTP enrollment, read [Authentication](AUTHENTICATION.md).

## Upgrade

1. Read the changelog and create a database backup plus a protected `.env` copy.
2. Pull the desired source revision without discarding local changes.
3. Run `docker compose up -d --build --wait`.
4. Check `docker compose ps` and `docker compose logs --tail=100 app`.
5. Sign in and test a conversation.

Application SQL migrations and authentication migrations run on container
startup. An edited previously applied application migration is rejected. If an
upgrade fails, retain the logs and restore the backup together with the
matching previous source version; do not delete data to clear an error.

## Diagnose

| Symptom | Check |
| --- | --- |
| Container exits at startup | Required variables, a real random secret, origin validation, data ownership, migration logs. |
| Login not permitted | Exact email in `ADMIN_EMAIL` or `ALLOWED_EMAILS`; registration does not accept arbitrary addresses. |
| OAuth redirect error | Callback URL, provider app status/test users, credentials, public origin. |
| Returning to login repeatedly | HTTPS, exact hostname, cookies, proxy scheme, clock, and shared auth secret. |
| 2FA code rejected | Automatic clock synchronization on server and phone; wait briefly after repeated attempts. |
| Reply never starts | Ollama model, connection test, Docker networking, proxy timeout. |
| Tokens arrive all at once | Disable proxy response buffering and caching. |
| Port already occupied | Choose another `--port` at initial setup or edit `GEKO_PORT`, then recreate. |

See [Backup and recovery](BACKUP_RESTORE.md). Never paste complete environment
files, cookies, tokens, or personal databases into a public report.
