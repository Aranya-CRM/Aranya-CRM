#!/usr/bin/env bash
set -euo pipefail

exec > >(tee -a /var/log/aranya-bootstrap.log) 2>&1

PROJECT_ID="aranya-crm-dev"
APP_DIR="/opt/aranya"
BOOTSTRAP_MARKER="/var/lib/aranya/bootstrap-complete"
TEMP_DOMAIN="aranya-dev.34-142-150-221.sslip.io"
INITIAL_BACKEND_IMAGE="asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/backend:b8931f1"
INITIAL_FRONTEND_IMAGE="asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/frontend:9af9a07"
CLOUD_SQL_CONNECTION="aranya-crm-dev:asia-southeast1:aranya-crm-dev-db"

if [[ -f "${BOOTSTRAP_MARKER}" ]]; then
  echo "Aranya CRM bootstrap already completed; skipping."
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose-v2 jq
systemctl enable --now docker

install -d -m 0750 "${APP_DIR}" "${APP_DIR}/secrets"

cat > "${APP_DIR}/images.env" <<EOF
BACKEND_IMAGE=${INITIAL_BACKEND_IMAGE}
FRONTEND_IMAGE=${INITIAL_FRONTEND_IMAGE}
EOF
chmod 0600 "${APP_DIR}/images.env"

cat > "${APP_DIR}/compose.yaml" <<EOF
services:
  cloud-sql-proxy:
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.24.1
    command:
      - --address=0.0.0.0
      - --port=5432
      - --structured-logs
      - ${CLOUD_SQL_CONNECTION}
    restart: unless-stopped
    mem_limit: 256m
    networks:
      - aranya

  backend:
    image: \${BACKEND_IMAGE}
    env_file:
      - ./secrets/backend.env
    environment:
      SPRING_PROFILES_ACTIVE: dev
      FIREBASE_PROJECT_ID: ${PROJECT_ID}
      FIREBASE_SERVICE_ACCOUNT_PATH: file:/secrets/firebase.json
      SPRING_DATASOURCE_URL: jdbc:postgresql://cloud-sql-proxy:5432/aranya_crm
      SPRING_DATASOURCE_USERNAME: aranya_admin
      APP_CORS_ALLOWED_ORIGINS: https://${TEMP_DOMAIN}
      EVENT_REPORT_GRACE_HOURS: "0"
      GOOGLE_GMAIL_ENABLED: "true"
      GOOGLE_GMAIL_FROM_ADDRESS: infotech@aranya.sg
      GOOGLE_GMAIL_FROM_NAME: Aranya CRM
      GOOGLE_CALENDAR_ENABLED: "true"
      GOOGLE_CALENDAR_AUTH_MODE: OAUTH
      GOOGLE_CALENDAR_TZ: Asia/Singapore
      GOOGLE_CALENDAR_LIST: c_rm92jb53d9kcdqug505764gth4@group.calendar.google.com|Aranya CASEWORK;c_fthgnknmg4o3oali8fgk11lf1c@group.calendar.google.com|Aranya METTA CARE
      GOOGLE_CALENDAR_DEFAULT_ID: c_rm92jb53d9kcdqug505764gth4@group.calendar.google.com
      GOOGLE_CALENDAR_OAUTH_CLIENT_ID: 746649380908-esbcfbu0egckeuucfng3n0tococv5s4b.apps.googleusercontent.com
      GCS_BUCKET_NAME: aranya-crm-dev-case-files
      TZ: Asia/Singapore
    volumes:
      - ./secrets/firebase.json:/secrets/firebase.json:ro
    depends_on:
      - cloud-sql-proxy
    restart: unless-stopped
    mem_limit: 3g
    networks:
      - aranya

  frontend:
    image: \${FRONTEND_IMAGE}
    environment:
      BACKEND_URL: http://backend:8080
    depends_on:
      - backend
    restart: unless-stopped
    mem_limit: 384m
    networks:
      - aranya

  caddy:
    image: caddy:2.10.2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
    restart: unless-stopped
    mem_limit: 256m
    networks:
      - aranya

networks:
  aranya:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
EOF

cat > "${APP_DIR}/Caddyfile" <<EOF
{
  email aranya.crm.admin@gmail.com
}

${TEMP_DOMAIN} {
  encode zstd gzip
  reverse_proxy frontend:8080
  log {
    output stdout
    format json
  }
}
EOF

cat > /usr/local/sbin/aranya-deploy <<'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="aranya-crm-dev"
APP_DIR="/opt/aranya"
METADATA_URL="http://metadata.google.internal/computeMetadata/v1"
IMAGES_FILE="${APP_DIR}/images.env"

metadata() {
  curl -fsS -H 'Metadata-Flavor: Google' "${METADATA_URL}/$1"
}

access_token() {
  metadata instance/service-accounts/default/token | jq -r '.access_token'
}

read_secret() {
  local secret_name="$1"
  local token
  token="$(access_token)"
  curl -fsS \
    -H "Authorization: Bearer ${token}" \
    "https://secretmanager.googleapis.com/v1/projects/${PROJECT_ID}/secrets/${secret_name}/versions/latest:access" \
    | jq -r '.payload.data' \
    | tr '_-' '/+' \
    | base64 -d
}

wait_for_application() {
  local attempt
  for attempt in $(seq 1 30); do
    if docker compose --env-file "${IMAGES_FILE}" exec -T caddy \
      wget -qO- http://backend:8080/actuator/health 2>/dev/null \
      | grep -q '"status":"UP"' \
      && docker compose --env-file "${IMAGES_FILE}" exec -T caddy \
        wget -qO- http://frontend:8080/ 2>/dev/null \
        | grep -qi '<!doctype html'; then
      return 0
    fi
    sleep 5
  done
  return 1
}

if [[ $# -ne 0 && $# -ne 2 ]]; then
  echo "Usage: aranya-deploy [BACKEND_IMAGE FRONTEND_IMAGE]" >&2
  exit 2
fi

candidate_file="$(mktemp "${APP_DIR}/images.env.candidate.XXXXXX")"
previous_file="${APP_DIR}/images.env.previous"
trap 'rm -f "${candidate_file}"' EXIT

if [[ $# -eq 2 ]]; then
  backend_image="$1"
  frontend_image="$2"
  [[ "${backend_image}" == asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/backend:* ]]
  [[ "${frontend_image}" == asia-southeast1-docker.pkg.dev/aranya-crm-dev/aranya-crm/frontend:* ]]
  printf 'BACKEND_IMAGE=%s\nFRONTEND_IMAGE=%s\n' \
    "${backend_image}" "${frontend_image}" > "${candidate_file}"
else
  cp "${IMAGES_FILE}" "${candidate_file}"
fi
chmod 0600 "${candidate_file}"

umask 077
read_secret firebase-sa-dev > "${APP_DIR}/secrets/firebase.json"
{
  printf 'SPRING_DATASOURCE_PASSWORD=%s\n' "$(read_secret db-pass-dev)"
  printf 'JWT_SECRET=%s\n' "$(read_secret jwt-secret-dev)"
  printf 'GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET=%s\n' "$(read_secret gcal-oauth-client-secret)"
  printf 'GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN=%s\n' "$(read_secret gcal-oauth-refresh-token)"
} > "${APP_DIR}/secrets/backend.env"
chmod 0600 "${APP_DIR}/secrets/firebase.json" "${APP_DIR}/secrets/backend.env"

token="$(access_token)"
printf '%s' "${token}" \
  | docker login -u oauth2accesstoken --password-stdin https://asia-southeast1-docker.pkg.dev

cd "${APP_DIR}"
docker compose --env-file "${candidate_file}" pull
cp "${IMAGES_FILE}" "${previous_file}"
mv "${candidate_file}" "${IMAGES_FILE}"
trap - EXIT

docker compose --env-file "${IMAGES_FILE}" up -d --remove-orphans
if ! wait_for_application; then
  echo "Deployment health check failed; rolling back images." >&2
  mv "${previous_file}" "${IMAGES_FILE}"
  docker compose --env-file "${IMAGES_FILE}" up -d --remove-orphans
  exit 1
fi

rm -f "${previous_file}"
docker image prune -f
DEPLOY

chmod 0750 /usr/local/sbin/aranya-deploy

cat > /etc/systemd/system/aranya-deploy.service <<'EOF'
[Unit]
Description=Deploy Aranya CRM containers
Wants=network-online.target docker.service
After=network-online.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/aranya-deploy
RemainAfterExit=yes
TimeoutStartSec=900

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now aranya-deploy.service
install -d -m 0755 "$(dirname "${BOOTSTRAP_MARKER}")"
touch "${BOOTSTRAP_MARKER}"
