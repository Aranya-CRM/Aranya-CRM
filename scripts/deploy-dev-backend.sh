#!/usr/bin/env bash
#
# Deploy the Aranya CRM backend to Cloud Run (DEV environment) + Cloud SQL.
# Idempotent: re-running only creates what's missing, then redeploys.
#
# Run from Cloud Shell (or any machine with gcloud + docker access):
#
#   export DEV_DB_PASSWORD='...'                       # password for the Cloud SQL user
#   export JWT_SECRET='...'                            # long random string
#   export FIREBASE_SA_FILE=./firebase-service-account-dev.json   # dev Firebase Admin SDK key
#   ./scripts/deploy-dev-backend.sh
#
# After the FIRST successful deploy, copy the printed backend URL — you'll need it
# for the frontend build (VITE_API_BASE_URL) and to set CORS back on this service.
#
set -euo pipefail

# ── Config (override via env if needed) ──────────────────────────────────────
PROJECT="${PROJECT:-aranya-crm-dev}"
REGION="${REGION:-asia-southeast1}"
REPO="${REPO:-aranya-crm}"
SQL_INSTANCE="${SQL_INSTANCE:-aranya-crm-dev-db}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
DB_NAME="${DB_NAME:-aranya_crm}"
DB_USER="${DB_USER:-aranya_admin}"
SERVICE="${SERVICE:-backend-dev}"
IMAGE_TAG="${IMAGE_TAG:-dev}"
APP_PUBLIC_BASE_URL="${APP_PUBLIC_BASE_URL:-http://localhost:5173}"
EVENT_REPORT_GRACE_HOURS="${EVENT_REPORT_GRACE_HOURS:-0}"
GOOGLE_GMAIL_ENABLED="${GOOGLE_GMAIL_ENABLED:-false}"
GOOGLE_GMAIL_FROM_ADDRESS="${GOOGLE_GMAIL_FROM_ADDRESS:-}"
GOOGLE_GMAIL_FROM_NAME="${GOOGLE_GMAIL_FROM_NAME:-Aranya CRM}"

# ── Google Calendar (non-secret; override via env if needed) ─────────────────
GCAL_ENABLED="${GCAL_ENABLED:-true}"
GCAL_AUTH_MODE="${GCAL_AUTH_MODE:-OAUTH}"
GCAL_TZ="${GCAL_TZ:-Asia/Singapore}"
GCAL_LIST="${GCAL_LIST:-c_rm92jb53d9kcdqug505764gth4@group.calendar.google.com|Aranya CASEWORK;c_fthgnknmg4o3oali8fgk11lf1c@group.calendar.google.com|Aranya METTA CARE}"
GCAL_DEFAULT_ID="${GCAL_DEFAULT_ID:-c_rm92jb53d9kcdqug505764gth4@group.calendar.google.com}"
GCAL_OAUTH_CLIENT_ID="${GCAL_OAUTH_CLIENT_ID:-746649380908-esbcfbu0egckeuucfng3n0tococv5s4b.apps.googleusercontent.com}"

# ── Required secrets (must be provided) ──────────────────────────────────────
: "${DEV_DB_PASSWORD:?set DEV_DB_PASSWORD}"
: "${JWT_SECRET:?set JWT_SECRET}"
FIREBASE_SA_FILE="${FIREBASE_SA_FILE:-firebase-service-account-dev.json}"
[ -f "$FIREBASE_SA_FILE" ] || { echo "Missing Firebase SA file: $FIREBASE_SA_FILE"; exit 66; }

# ── Optional: Google Calendar OAuth secrets (calendar is enabled only when both set) ──
#   export GCAL_OAUTH_CLIENT_SECRET='GOCSPX-...'
#   export GCAL_OAUTH_REFRESH_TOKEN='1//0...'

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/backend:${IMAGE_TAG}"

echo "==> Project=$PROJECT Region=$REGION Service=$SERVICE"
gcloud config set project "$PROJECT" >/dev/null

# ── 1) Enable APIs ───────────────────────────────────────────────────────────
echo "==> Enabling APIs"
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com \
  iamcredentials.googleapis.com gmail.googleapis.com

# ── 2) Artifact Registry repo ────────────────────────────────────────────────
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repo $REPO"
  gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION"
fi

# ── 3) Cloud SQL instance + db + user ────────────────────────────────────────
if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "==> Creating Cloud SQL instance $SQL_INSTANCE (this takes a few minutes)"
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_15 --tier="$SQL_TIER" --region="$REGION"
fi
gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" >/dev/null 2>&1 \
  || gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
if gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_USER"; then
  gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DEV_DB_PASSWORD"
else
  gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DEV_DB_PASSWORD"
fi
CONN="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
echo "==> Cloud SQL connection: $CONN"

# ── 4) Secrets (create if missing, else add a new version) ───────────────────
upsert_secret() { # name, value-from-stdin
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    gcloud secrets versions add "$1" --data-file=-
  else
    gcloud secrets create "$1" --data-file=-
  fi
}
echo "==> Upserting secrets"
upsert_secret firebase-sa-dev < "$FIREBASE_SA_FILE"
printf '%s' "$JWT_SECRET"       | upsert_secret jwt-secret-dev
printf '%s' "$DEV_DB_PASSWORD"  | upsert_secret db-pass-dev

# Google Calendar/Gmail OAuth secrets — only when both are provided
GCAL_READY=0
if [ -n "${GCAL_OAUTH_CLIENT_SECRET:-}" ] && [ -n "${GCAL_OAUTH_REFRESH_TOKEN:-}" ]; then
  printf '%s' "$GCAL_OAUTH_CLIENT_SECRET" | upsert_secret gcal-oauth-client-secret
  printf '%s' "$GCAL_OAUTH_REFRESH_TOKEN" | upsert_secret gcal-oauth-refresh-token
  GCAL_READY=1
  echo "==> Google Calendar/Gmail OAuth secrets upserted"
else
  echo "==> (skip) GCAL_OAUTH_CLIENT_SECRET / GCAL_OAUTH_REFRESH_TOKEN not set — calendar disabled"
fi

# ── 5) Grant the Cloud Run runtime SA the roles it needs (before deploy) ─────
PROJ_NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
RUNTIME_SA="${PROJ_NUM}-compute@developer.gserviceaccount.com"
for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" --role="$role" --condition=None >/dev/null
done

# GCS signed URLs are generated inside Cloud Run using Application Default Credentials.
# Cloud Run's metadata credentials need signBlob on the runtime service account.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null

# ── 6) Build + push backend image ────────────────────────────────────────────
echo "==> Building backend image $IMAGE"
gcloud builds submit backend --tag "$IMAGE"

# ── 7) Deploy to Cloud Run ───────────────────────────────────────────────────
DS_URL="jdbc:postgresql:///${DB_NAME}?cloudSqlInstance=${CONN}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"

# Base env vars / secrets; calendar appended when GCAL_READY=1
ENV_VARS="^##^SPRING_PROFILES_ACTIVE=dev##FIREBASE_PROJECT_ID=${PROJECT}##FIREBASE_SERVICE_ACCOUNT_PATH=file:/secrets/firebase.json##SPRING_DATASOURCE_URL=${DS_URL}##SPRING_DATASOURCE_USERNAME=${DB_USER}##APP_PUBLIC_BASE_URL=${APP_PUBLIC_BASE_URL}##EVENT_REPORT_GRACE_HOURS=${EVENT_REPORT_GRACE_HOURS}##GOOGLE_GMAIL_ENABLED=${GOOGLE_GMAIL_ENABLED}##GOOGLE_GMAIL_FROM_ADDRESS=${GOOGLE_GMAIL_FROM_ADDRESS}##GOOGLE_GMAIL_FROM_NAME=${GOOGLE_GMAIL_FROM_NAME}"
SECRETS="/secrets/firebase.json=firebase-sa-dev:latest,SPRING_DATASOURCE_PASSWORD=db-pass-dev:latest,JWT_SECRET=jwt-secret-dev:latest"
if [ "$GCAL_READY" = "1" ]; then
  ENV_VARS="${ENV_VARS}##GOOGLE_CALENDAR_ENABLED=${GCAL_ENABLED}##GOOGLE_CALENDAR_AUTH_MODE=${GCAL_AUTH_MODE}##GOOGLE_CALENDAR_TZ=${GCAL_TZ}##GOOGLE_CALENDAR_LIST=${GCAL_LIST}##GOOGLE_CALENDAR_DEFAULT_ID=${GCAL_DEFAULT_ID}##GOOGLE_CALENDAR_OAUTH_CLIENT_ID=${GCAL_OAUTH_CLIENT_ID}"
  SECRETS="${SECRETS},GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET=gcal-oauth-client-secret:latest,GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN=gcal-oauth-refresh-token:latest"
fi

echo "==> Deploying $SERVICE"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" --region "$REGION" --allow-unauthenticated \
  --min-instances 1 --no-cpu-throttling \
  --add-cloudsql-instances "$CONN" \
  --set-env-vars "$ENV_VARS" \
  --set-secrets "$SECRETS"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo ""
echo "==> Backend deployed: $URL"
echo "==> Health check:"
curl -fsS "${URL}/actuator/health" && echo ""
echo ""
echo "Next:"
echo "  1) Build frontend with VITE_API_BASE_URL=${URL}"
echo "  2) After frontend is deployed, set CORS:"
echo "     gcloud run services update ${SERVICE} --region ${REGION} \\"
echo "       --update-env-vars APP_CORS_ALLOWED_ORIGINS=<frontend-dev-url>"
