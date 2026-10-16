# Configuration reference

Use `.env.example` as a template. Never commit `.env`. Compose reads the file
and passes values to the application; recreate containers after changes.

| Variable | Required / default | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_URL` | Required | Exact public origin, such as `https://chat.example.com`. No path; HTTP only on loopback. |
| `BETTER_AUTH_SECRET` | Required | Random secret ≥32 characters; installer generates 64 hex characters. Preserve across upgrades. |
| `ADMIN_EMAIL` | Required | Allowed address that can initialize the application's saved owner. |
| `ALLOWED_EMAILS` | Empty | Additional comma-separated invited addresses. Admin is always allowed. |
| `GEKO_PORT` | `3000` | Host application port published by Compose. |
| `GEKO_BIND` | `127.0.0.1` | Host bind; `0.0.0.0` permits a remote proxy with appropriate firewall restrictions. |
| `COMPOSE_PROFILES` | `local` | Enable bundled Ollama; empty for external inference. |
| `COMPOSE_FILE` | `compose.yaml` | NVIDIA mode adds `:deploy/compose.nvidia.yaml`. |
| `GEKO_DOWNLOAD_MODEL` | `true` | Installer pulls configured model on each run; `false` skips weights. |
| `OLLAMA_URL` / `OLLAMA_MODEL` | Bundled endpoint / `qwen3:8b` | Seed initial database connection only; saved owner settings win later. |
| `DATA_DIR` | Native `./data`; container `/app/data` | Persistent directory containing `geko.sqlite` and WAL files. |
| `ALLOW_PRIVATE_OLLAMA` | `true` in standalone | Permit HTTP and private-address Ollama endpoints for the administrator. Set `false` to require public HTTPS. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional pair | Enable Google OAuth. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional pair | Enable GitHub OAuth. |
| `SMTP_HOST` / `MAIL_FROM` | Optional together | Enable email recovery and verification delivery. |
| `SMTP_PORT` | `587` | Mail port; 465 uses TLS, others require STARTTLS. |
| `SMTP_USER` / `SMTP_PASSWORD` | Optional | SMTP authentication when required by the mail server. |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | Require verified email for password login; requires SMTP. |

`NODE_ENV`, `HOSTNAME`, and `PORT` are fixed for the container process by
Compose. `GEKO_PORT` changes the host port, not the internal listening port.

Ollama URL, bearer token, model, creativity, and context window are saved by
the administrator in the database through Settings. The shared gateway token
is never returned to browsers. SQLite and `.env` must be protected as sensitive
server data. OAuth token encryption and 2FA secret encryption depend on the
authentication secret; app record data and the Ollama configuration are not
whole-database encrypted. Use encrypted disks/backups when needed.

Compose publishes the app on loopback by default. It uses separate named
volumes for application data and Ollama model storage. The local profile starts
Ollama without exposing its port. Model weights are downloaded by the installer,
not baked into the image. HTTPS proxy and SMTP are configured separately.
