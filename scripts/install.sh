#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
url='' admin='' port='3000' noninteractive=false skip_start=false
usage() { cat <<'HELP'
Usage: bash scripts/install.sh [--url https://chat.example.com] [--admin-email admin@example.com]
       [--port 3000] [--non-interactive] [--skip-start]
Requires Docker Engine with Compose v2. Run from a clone of the repository.
Creates .env once; later runs preserve configuration and persistent data.
HELP
}
while (($#)); do
 case "$1" in
  --url|--admin-email|--port)
   (($# >= 2)) || { usage; exit 2; }
   case "$1" in --url) url=$2;; --admin-email) admin=$2;; --port) port=$2;; esac; shift 2;;
  --non-interactive) noninteractive=true; shift;;
  --skip-start) skip_start=true; shift;;
  --help|-h) usage; exit 0;;
  *) usage; exit 2;;
 esac
done
command -v docker >/dev/null || { echo 'Install Docker Engine and Docker Compose v2 first. See docs/SELF_HOSTING.md.' >&2; exit 1; }
docker compose version >/dev/null
if [[ ! -e .env ]]; then
 if ! $noninteractive; then
  [[ -n "$url" ]] || read -r -p 'Public origin (https://chat.example.com, or http://localhost:3000): ' url
  [[ -n "$admin" ]] || read -r -p 'Administrator email: ' admin
 fi
 [[ "$url" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ || "$url" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?/?$ ]] || { echo 'Provide an HTTPS origin, or HTTP on localhost/127.0.0.1.' >&2; exit 2; }
 [[ "$admin" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || { echo 'Provide a valid administrator email.' >&2; exit 2; }
 [[ "$port" =~ ^[0-9]{1,5}$ ]] && ((10#$port >= 1 && 10#$port <= 65535)) || { echo 'Invalid port.' >&2; exit 2; }
 umask 077
 secret=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
 [[ ${#secret} == 64 ]] || { echo 'Cannot generate authentication secret.' >&2; exit 1; }
 # Only validated values and kernel-generated hex are written to dotenv.
 while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
   BETTER_AUTH_URL=*) printf 'BETTER_AUTH_URL=%s\n' "${url%/}";;
   BETTER_AUTH_SECRET=*) printf 'BETTER_AUTH_SECRET=%s\n' "$secret";;
   ADMIN_EMAIL=*) printf 'ADMIN_EMAIL=%s\n' "$admin";;
   GEKO_PORT=*) printf 'GEKO_PORT=%s\n' "$port";;
   *) printf '%s\n' "$line";;
  esac
 done < .env.example > .env
 chmod 600 .env
 echo 'Created .env. Keep its authentication secret with your backups.'
else
 echo 'Keeping existing .env and data. Back up before upgrading.'
fi
docker compose config --quiet
if $skip_start; then echo 'Configuration ready. Start with: docker compose up -d --build'; exit 0; fi
docker compose up -d --build --wait --wait-timeout 180
echo 'geko.ai is running. Register using ADMIN_EMAIL. Set up HTTPS before remote access.'
echo 'Enable optional providers and email delivery in .env, then run: docker compose up -d'
