#!/usr/bin/env bash
# geko.ai server installer. Prompts use /dev/tty so curl | sudo bash stays interactive.
set -Eeuo pipefail
umask 077
REPOSITORY='https://github.com/memegeko/geko-ai.git'
INSTALL_DIR='/opt/geko-ai'
URL='' ADMIN='' PORT='3000' MODEL='qwen3:8b' MODEL_MODE='download'
OLLAMA_URL='' GPU='auto' BIND='127.0.0.1'
NONINTERACTIVE=false SKIP_START=false NO_DEPS=false UPDATE=false
MODEL_EXPLICIT=false HAS_TTY=false TUI=false
TEMP_DIR=''
cleanup() { [[ -z "$TEMP_DIR" ]] || rm -rf -- "$TEMP_DIR"; }
trap cleanup EXIT
trap 'printf "\nInstallation failed at line %s. Your configuration and volumes have been kept.\n" "$LINENO" >&2' ERR
usage() {
 cat <<'HELP'
geko.ai — your characters, your server
Usage: install.sh [options]
  --dir PATH               Installation folder (default /opt/geko-ai)
  --url ORIGIN             HTTPS public origin, or http://localhost:PORT
  --admin-email EMAIL      Invited administrator address
  --port PORT              Host application port (default 3000)
  --bind ADDRESS           127.0.0.1 (default) or 0.0.0.0 for a remote reverse proxy
  --model TAG              Ollama model (default qwen3:8b)
  --skip-model             Install local Ollama without downloading model weights
  --ollama-url URL         Use existing Ollama; no local Ollama or model download
  --gpu auto|cpu|nvidia    Local inference hardware (default auto)
  --update                 Fast-forward an unmodified main checkout and rebuild
  --non-interactive        Use flags instead of prompts; requires URL and admin on first install
  --skip-start             Write and validate configuration without building/starting
  --no-deps                Do not install host packages (Docker/Compose must exist)
  -h, --help               Show help

Run again to keep your .env, database, and model volume. Use --update to upgrade.
HELP
}
fail() { printf '\nError: %s\n' "$*" >&2; exit 2; }
info() { printf '\n\033[1;38;5;120m  › %s\033[0m\n' "$*"; }
while (($#)); do
 case "$1" in
  --dir|--url|--admin-email|--port|--bind|--model|--ollama-url|--gpu)
   (($# >= 2)) && [[ -n "$2" ]] || fail "Missing value for $1"
   case "$1" in
    --dir) INSTALL_DIR=$2;; --url) URL=$2;; --admin-email) ADMIN=$2;; --port) PORT=$2;;
    --bind) BIND=$2;; --model) MODEL=$2; MODEL_EXPLICIT=true;;
    --ollama-url) OLLAMA_URL=$2; MODEL_MODE=existing; MODEL_EXPLICIT=true;; --gpu) GPU=$2;;
   esac; shift 2;;
  --skip-model) [[ "$MODEL_MODE" == existing ]] || MODEL_MODE=skip; MODEL_EXPLICIT=true; shift;;
  --non-interactive|--yes) NONINTERACTIVE=true; shift;;
  --skip-start) SKIP_START=true; shift;; --no-deps) NO_DEPS=true; shift;; --update) UPDATE=true; shift;;
  --help|-h) usage; exit 0;; *) fail "Unknown option: $1";;
 esac
done
[[ "$INSTALL_DIR" == /* && "$INSTALL_DIR" != / && "$INSTALL_DIR" != *$'\n'* && "$INSTALL_DIR" != *$'\r'* ]] || fail '--dir must be an absolute folder other than /.'
case "$GPU" in auto|cpu|nvidia) ;; *) fail '--gpu must be auto, cpu, or nvidia.';; esac
if ! $NONINTERACTIVE && ( : < /dev/tty ) 2>/dev/null; then HAS_TTY=true; fi
$HAS_TTY || NONINTERACTIVE=true
[[ "$EUID" == 0 ]] || $NO_DEPS || fail 'Run this installer using sudo (or as root). See --help.'
[[ $(uname -s) == Linux ]] || fail 'This server installer supports Linux.'

# A plain terminal wizard remains available when whiptail cannot be installed.
prompt() {
 local destination=$1 label=$2 initial=${3:-} answer
 if $TUI; then
  answer=$(whiptail --title 'geko.ai  /  server setup' --backtitle 'Your characters. Your conversations. Your server.' --inputbox "$label" 11 76 "$initial" 3>&1 1>&2 2>&3 </dev/tty >/dev/tty) || exit 0
 else
  printf '\n%s [%s]: ' "$label" "$initial" >/dev/tty
  read -r answer </dev/tty || exit 0
  answer=${answer:-$initial}
 fi
 printf -v "$destination" '%s' "$answer"
}
menu() {
 local destination=$1 label=$2 initial=$3 answer; shift 3
 if $TUI; then
  answer=$(whiptail --title 'geko.ai  /  server setup' --backtitle 'Self-hosted. Private. Yours.' --default-item "$initial" --menu "$label" 18 78 6 "$@" 3>&1 1>&2 2>&3 </dev/tty >/dev/tty) || exit 0
 else
  printf '\n%s\n' "$label" >/dev/tty
  local options=("$@")
  for ((i=0;i<${#options[@]};i+=2)); do printf '  %-12s %s\n' "${options[i]}" "${options[i+1]}" >/dev/tty; done
  printf 'Choice [%s]: ' "$initial" >/dev/tty; read -r answer </dev/tty || exit 0; answer=${answer:-$initial}
 fi
 printf -v "$destination" '%s' "$answer"
}
confirm() {
 if $TUI; then
  whiptail --title 'geko.ai  /  ready to install' --yes-button Install --no-button Cancel --yesno "$1" 19 78 </dev/tty >/dev/tty 2>/dev/tty || exit 0
 else
  local answer; printf '\n%s\n\nContinue? [y/N]: ' "$1" >/dev/tty; read -r answer </dev/tty || exit 0
  [[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]] || exit 0
 fi
}
package_install() {
 if command -v apt-get >/dev/null; then
  apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$@"
 elif command -v dnf >/dev/null; then dnf install -y "$@"
 elif command -v pacman >/dev/null; then pacman -S --needed --noconfirm "$@"
 else fail 'Install Docker Engine, Compose, git, curl, and whiptail manually, then use --no-deps.'; fi
}
if ! $NO_DEPS; then
 if ! command -v git >/dev/null || ! command -v curl >/dev/null; then info 'Installing download tools'; package_install git curl ca-certificates; fi
 if $HAS_TTY && ! command -v whiptail >/dev/null; then
  if command -v apt-get >/dev/null; then package_install whiptail || true
  elif command -v dnf >/dev/null; then package_install newt || true
  elif command -v pacman >/dev/null; then package_install libnewt || true; fi
 fi
fi
if $HAS_TTY && command -v whiptail >/dev/null && [[ ${TERM:-dumb} != dumb ]]; then
 TUI=true
 export NEWT_COLORS='root=white,black window=white,black border=green,black title=green,black textbox=white,black button=black,green actbutton=black,white listbox=white,black actlistbox=black,green entry=black,white'
fi
printf '\n\033[1;38;5;120m  geko.ai\033[0m  /  your server, your stories\n'

# Read dotenv values as data. Never source a configuration file as shell code.
env_value() { sed -n "s/^$1=//p" "$INSTALL_DIR/.env" | head -n 1; }
FRESH=true
[[ ! -f "$INSTALL_DIR/.env" ]] || FRESH=false
if $FRESH; then
 if ! $NONINTERACTIVE; then
  prompt PORT 'Application port on this server' "$PORT"
  [[ -n "$URL" ]] || prompt URL 'Site origin: HTTPS domain, or localhost with SSH forwarding' "http://localhost:$PORT"
  [[ -n "$ADMIN" ]] || prompt ADMIN 'Administrator email (only invited addresses can register)' ''
  if ! $MODEL_EXPLICIT; then
   menu MODEL_MODE 'How should this server run the AI?' download download 'Install Ollama + download a model' skip 'Install Ollama; download model later' existing 'Use an existing Ollama server'
  fi
  if [[ "$MODEL_MODE" == existing ]]; then [[ -n "$OLLAMA_URL" ]] || prompt OLLAMA_URL 'Existing Ollama endpoint (reachable from the app container)' 'http://host.docker.internal:11434'; fi
  prompt MODEL 'Ollama model tag' "$MODEL"
  if [[ "$MODEL_MODE" != existing ]]; then menu GPU 'Inference hardware: auto uses NVIDIA when a working driver is detected' "$GPU" auto 'Detect NVIDIA, otherwise CPU' cpu 'CPU only' nvidia 'NVIDIA GPU (driver must already work)'; fi
 fi
 [[ "$URL" =~ ^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]+)?/?$ || "$URL" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?/?$ ]] || fail 'Provide --url as an HTTPS origin, or HTTP localhost/127.0.0.1.'
 [[ "$ADMIN" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || fail 'Provide a valid --admin-email.'
 [[ "$PORT" =~ ^[0-9]{1,5}$ ]] && ((10#$PORT >= 1 && 10#$PORT <= 65535)) || fail 'Invalid port.'
 [[ "$BIND" == 127.0.0.1 || "$BIND" == 0.0.0.0 ]] || fail '--bind must be 127.0.0.1 or 0.0.0.0.'
 [[ "$MODEL" =~ ^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$ ]] || fail 'Invalid model tag.'
 case "$MODEL_MODE" in download|skip|existing) ;; *) fail 'Invalid AI installation mode.';; esac
 if [[ "$MODEL_MODE" == existing ]]; then
  [[ "$OLLAMA_URL" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/[a-zA-Z0-9._~/-]*)?$ ]] || fail 'Invalid existing Ollama HTTP(S) URL. Configure bearer tokens in site Settings afterward.'
  [[ ! "$OLLAMA_URL" =~ ^http://(localhost|127\.0\.0\.1)(:|/|$) ]] || fail 'Inside Docker localhost is the app container. Use host.docker.internal or a LAN address.'
 fi
 if ! $NONINTERACTIVE; then
  confirm "Folder: $INSTALL_DIR
Site: $URL
Administrator: $ADMIN
AI: $MODEL_MODE / $MODEL
GPU: $GPU
Bind: $BIND:$PORT

Installs missing Docker dependencies, builds the site, and creates persistent data/model volumes. NVIDIA setup may restart Docker. HTTPS domains use your existing reverse proxy."
 fi
else
 if $MODEL_EXPLICIT; then fail 'Existing .env is preserved. Change OLLAMA_MODEL/OLLAMA_URL and COMPOSE_PROFILES there, then rerun; download with docker compose exec ollama ollama pull MODEL.'; fi
 info 'Keeping existing configuration, database, and models'
fi

if ! command -v docker >/dev/null; then
 $NO_DEPS && fail 'Docker is required with --no-deps.'
 info 'Installing Docker Engine and Compose'
 if command -v pacman >/dev/null; then package_install docker docker-compose
 else
  TEMP_DIR=$(mktemp -d)
  curl -fsSL --retry 3 https://get.docker.com -o "$TEMP_DIR/docker-install.sh"
  sh "$TEMP_DIR/docker-install.sh"
 fi
fi
if ! docker compose version >/dev/null 2>&1; then
 $NO_DEPS && fail 'Docker Compose plugin is required.'
 if command -v pacman >/dev/null; then package_install docker-compose
 else package_install docker-compose-plugin; fi
fi
if ! docker info >/dev/null 2>&1; then
 $NO_DEPS && fail 'Docker daemon is not reachable.'
 systemctl enable --now docker
fi
docker info >/dev/null || fail 'Cannot reach the Docker daemon.'
if [[ ! -f "$INSTALL_DIR/package.json" || ! -f "$INSTALL_DIR/src/lib/storage.mjs" || ! -f "$INSTALL_DIR/compose.yaml" ]]; then
 if $UPDATE && [[ -d "$INSTALL_DIR/.git" ]] && [[ $(git -C "$INSTALL_DIR" remote get-url origin) == "$REPOSITORY" ]]; then
  : # An earlier checkout can be upgraded to the new source layout.
 else
 [[ ! -e "$INSTALL_DIR" || ( -d "$INSTALL_DIR" && -z $(ls -A "$INSTALL_DIR") ) ]] || fail 'Installation folder contains unrelated files. Choose an empty --dir.'
 info 'Downloading geko.ai source'
 git clone --depth 1 --branch main "$REPOSITORY" "$INSTALL_DIR"
 fi
fi
cd -- "$INSTALL_DIR"
if $UPDATE; then
 [[ -d .git ]] || fail '--update requires a Git checkout.'
 [[ $(git remote get-url origin) == "$REPOSITORY" ]] || fail 'Unexpected Git origin; update manually.'
 [[ $(git branch --show-current) == main ]] || fail 'Switch to main before updating.'
 [[ -z $(git status --porcelain --untracked-files=no) ]] || fail 'Local source edits found. Commit or save them before updating.'
 if ! $SKIP_START && [[ -f .env ]]; then
  info 'Backing up before update'
  mkdir -p backups
  docker compose exec -T app node scripts/backup.mjs /app/data/pre-update.sqlite
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  docker compose cp app:/app/data/pre-update.sqlite "backups/$stamp.sqlite"
  cp .env "backups/$stamp.env"; chmod 600 "backups/$stamp.sqlite" "backups/$stamp.env"
 fi
 git pull --ff-only origin main
fi
if $FRESH; then
 PROFILES=''
 if [[ "$MODEL_MODE" != existing ]]; then
  PROFILES=local; OLLAMA_URL='http://ollama:11434'
  if [[ "$GPU" == auto ]]; then
   GPU=cpu
   if command -v nvidia-smi >/dev/null && nvidia-smi >/dev/null 2>&1; then GPU=nvidia; fi
  fi
 fi
 if [[ "$GPU" == nvidia && "$MODEL_MODE" != existing ]] && ! $SKIP_START; then
  command -v nvidia-smi >/dev/null && nvidia-smi >/dev/null 2>&1 || fail 'NVIDIA driver is unavailable. Install the host driver or choose --gpu cpu.'
  if ! command -v nvidia-ctk >/dev/null; then
   $NO_DEPS && fail 'NVIDIA Container Toolkit is required (or choose --gpu cpu).'
   info 'Installing NVIDIA Container Toolkit'
   if command -v apt-get >/dev/null; then
    package_install gnupg
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor --yes -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' > /etc/apt/sources.list.d/nvidia-container-toolkit.list
   elif command -v dnf >/dev/null; then
    curl -fsSL https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo -o /etc/yum.repos.d/nvidia-container-toolkit.repo
   fi
   package_install nvidia-container-toolkit
  fi
  if ! docker info --format '{{json .Runtimes}}' | grep -q nvidia; then
   nvidia-ctk runtime configure --runtime=docker
   systemctl restart docker
  fi
 fi
 secret=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
 [[ ${#secret} == 64 ]] || fail 'Cannot generate authentication secret.'
 # Validated input only; write atomically, and never log the secret.
 while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
   BETTER_AUTH_URL=*) printf 'BETTER_AUTH_URL=%s\n' "${URL%/}";;
   BETTER_AUTH_SECRET=*) printf 'BETTER_AUTH_SECRET=%s\n' "$secret";;
   ADMIN_EMAIL=*) printf 'ADMIN_EMAIL=%s\n' "$ADMIN";; GEKO_PORT=*) printf 'GEKO_PORT=%s\n' "$PORT";;
   GEKO_BIND=*) printf 'GEKO_BIND=%s\n' "$BIND";; OLLAMA_URL=*) printf 'OLLAMA_URL=%s\n' "${OLLAMA_URL%/}";;
   OLLAMA_MODEL=*) printf 'OLLAMA_MODEL=%s\n' "$MODEL";; COMPOSE_PROFILES=*) printf 'COMPOSE_PROFILES=%s\n' "$PROFILES";;
   GEKO_DOWNLOAD_MODEL=*) if [[ "$MODEL_MODE" == download ]]; then printf 'GEKO_DOWNLOAD_MODEL=true\n'; else printf 'GEKO_DOWNLOAD_MODEL=false\n'; fi;;
   COMPOSE_FILE=*) if [[ "$GPU" == nvidia && "$MODEL_MODE" != existing ]]; then printf 'COMPOSE_FILE=compose.yaml:deploy/compose.nvidia.yaml\n'; else printf 'COMPOSE_FILE=compose.yaml\n'; fi;;
   *) printf '%s\n' "$line";;
  esac
 done < .env.example > .env.installing
 chmod 600 .env.installing; mv .env.installing .env
 info 'Saved protected configuration'
fi
docker compose config --quiet
if $SKIP_START; then info 'Configuration ready. Start with: docker compose up -d --build --wait'; exit 0; fi
info 'Building and starting geko.ai (first build can take several minutes)'
docker compose up -d --build --wait --wait-timeout 300
if [[ $(env_value COMPOSE_PROFILES) == local && $(env_value GEKO_DOWNLOAD_MODEL) == true ]]; then
 info 'Downloading your model (Ollama displays live progress)'
 docker compose exec -T ollama ollama pull "$(env_value OLLAMA_MODEL)"
elif [[ $(env_value COMPOSE_PROFILES) == local ]]; then
 info 'Model download skipped. The site and Ollama are installed.'
 printf '  Download later: cd %q && sudo docker compose exec ollama ollama pull %q\n' "$INSTALL_DIR" "$(env_value OLLAMA_MODEL)"
fi
info 'geko.ai is ready'
printf '  Site: %s\n  Register with: %s\n  Folder: %s\n' "$(env_value BETTER_AUTH_URL)" "$(env_value ADMIN_EMAIL)" "$INSTALL_DIR"
if [[ $(env_value BETTER_AUTH_URL) == http://* ]]; then
 printf '  From another computer: ssh -L %s:127.0.0.1:%s user@your-server\n' "$(env_value GEKO_PORT)" "$(env_value GEKO_PORT)"
else printf '  Point your HTTPS reverse proxy at %s:%s (see deploy/Caddyfile.example).\n' "$(env_value GEKO_BIND)" "$(env_value GEKO_PORT)"; fi
printf '  Status: cd %q && sudo docker compose ps\n  Logs:   cd %q && sudo docker compose logs -f\n' "$INSTALL_DIR" "$INSTALL_DIR"
