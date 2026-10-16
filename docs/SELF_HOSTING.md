# Self-hosting geko.ai

## Requirements

A Linux server with outbound internet access, curl, and root/sudo access. The
installer bootstraps dependencies on Debian/Ubuntu, Fedora, and Arch Linux.
Other Linux distributions can use `--no-deps` after installing Docker Engine,
Compose, and git manually. Docker must be reachable by the installer user.
The script does not configure rootless Docker. Node and pnpm run inside the
build container; installing them on the host is unnecessary.

Allow disk space for container builds and model weights. Size RAM and GPU VRAM
for your selected model. CPU mode works without a GPU. NVIDIA mode requires a
working host driver; the installer can install/configure NVIDIA Container
Toolkit. Configuring a new GPU runtime can restart Docker. AMD-specific setup
is not automated; use an existing Ollama endpoint for such a host.

## Terminal wizard

```bash
curl -fsSL https://raw.githubusercontent.com/memegeko/geko-ai/main/install.sh | sudo bash
```

Whiptail provides a full-screen terminal interface when available. Otherwise,
colored terminal prompts provide the same choices. Prompts read `/dev/tty`,
including when the script is piped to Bash over SSH. Cancel exits the wizard.
A session without a controlling terminal must supply the required flags.

1. Select the application port and exact site origin.
2. Enter the administrator email. Registration is limited to invited addresses.
3. Choose model download now, download later, or an existing Ollama endpoint.
4. Choose the model tag and CPU/automatic/NVIDIA hardware for local Ollama.
5. Review the installation summary and start.

The source is cloned into `/opt/geko-ai` unless `--dir` specifies another absolute
folder. An unrelated existing folder is refused. The installer creates a random
64-character secret in a mode-600 `.env`, builds the app, starts services, and
waits for health checks. Model downloads display Ollama's progress; failures
return an error while preserving configuration and volumes for a retry.

The AI endpoint and model seed database settings on first startup. Saved owner
settings take precedence afterward. A skipped model must be downloaded before
it can generate replies. The `ollama/ollama:latest` image is pulled on first
install; **Download later skips model weights, not the Ollama software image**.

## Origin and HTTPS

For an HTTPS domain, configure DNS and your existing reverse proxy. The
installer does not create DNS records or certificates. `deploy/Caddyfile.example` gives
a Caddy example. Use a valid domain with Caddy installed on the host; its proxy
will request certificates when DNS and ports permit it.

Compose binds the app to `127.0.0.1:3000` by default. If your reverse proxy runs
in another container/host, use a suitable private network or choose
`--bind 0.0.0.0` and restrict access at the firewall. Ollama is only on the private
Docker network and does not publish a host port.

For a localhost installation on a remote server, create an SSH tunnel:

```bash
ssh -L 3000:127.0.0.1:3000 user@your-server
```

Open `http://localhost:3000`. Use matching ports if you chose a different one.
HTTP LAN origins are refused because account security requires HTTPS except
on loopback. Use an HTTPS domain for normal access from multiple devices.

## First account and friends

Visit `/login`, choose **Create an invited account**, and use `ADMIN_EMAIL`.
The password is chosen in the browser, not stored in the shell history. Add
friends' addresses to `ALLOWED_EMAILS` in `.env`, then recreate containers:

```bash
cd /opt/geko-ai
sudo docker compose up -d
```

See [authentication](AUTHENTICATION.md) for OAuth, SMTP, and TOTP. A server
installer cannot register Google/GitHub provider apps on your behalf.

## Install from a checkout

```bash
git clone https://github.com/memegeko/geko-ai.git
cd geko-ai
sudo bash install.sh --dir "$PWD"
```

For automation use `--non-interactive --url ORIGIN --admin-email EMAIL`.
`--skip-model` skips weights; `--ollama-url URL` uses an existing model server;
`--gpu cpu` avoids GPU setup. `--skip-start` prepares configuration only.
`--no-deps` skips package/service changes and requires Docker to be running.
Run `bash install.sh --help` for all options.

## Upgrade

```bash
cd /opt/geko-ai
sudo bash install.sh --update --non-interactive
```

The installer refuses unexpected repositories, non-main checkouts, and edited
tracked files. It creates a consistent database backup and copies the matching
`.env` into `backups/` before fast-forwarding main and rebuilding. This needs a
running application container. If it is stopped, start it first or take a
manual consistent backup and perform the source update yourself.

Normal reruns do not fetch source. They validate the existing configuration,
rebuild/start the current checkout, and retry a configured model download.
Existing configuration flags are not used to overwrite `.env` silently. Edit
`.env` explicitly for changed ports, providers, or model mode. Editing
`OLLAMA_URL`/`OLLAMA_MODEL` does not replace an already saved connection; use
site Settings to change that. Keep both data volumes and the auth secret.

See [backup and restore](BACKUP_RESTORE.md) and [configuration](CONFIGURATION.md).

## Diagnose

```bash
cd /opt/geko-ai
sudo docker compose ps
sudo docker compose logs --tail=100 app ollama
sudo docker compose exec ollama ollama list
```

| Symptom | Check |
| --- | --- |
| Build/start fails | Container logs, available disk/RAM, network, required `.env` values. |
| No model replies | Exact model tag is installed; pull it if download was skipped. |
| GPU setup fails | Working NVIDIA driver, toolkit/runtime, `nvidia-smi`; use CPU or existing Ollama. |
| Login loops | Exact origin, HTTPS proxy, cookies, unchanged auth secret, clock. |
| Login not invited | Address matches `ADMIN_EMAIL` or `ALLOWED_EMAILS`. |
| External Ollama unreachable | Endpoint must be reachable from the app container; localhost points inside it. |
| Replies arrive together | Disable response buffering/caching in the proxy. |
