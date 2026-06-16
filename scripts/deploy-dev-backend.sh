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

# ── Required secrets (must be provided) ──────────────────────────────────────
: "${DEV_DB_PASSWORD:?set DEV_DB_PASSWORD}"
: "${JWT_SECRET:?set JWT_SECRET}"
FIREBASE_SA_FILE="${FIREBASE_SA_FILE:-firebase-service-account-dev.json}"
[ -f "$FIREBASE_SA_FILE" ] || { echo "Missing Firebase SA file: $FIREBASE_SA_FILE"; exit 66; }

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/backend:${IMAGE_TAG}"

echo "==> Project=$PROJECT Region=$REGION Service=$SERVICE"
gcloud config set project "$PROJECT" >/dev/null

# ── 1) Enable APIs ───────────────────────────────────────────────────────────
echo "==> Enabling APIs"
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com

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

# ── 5) Grant the Cloud Run runtime SA the roles it needs (before deploy) ─────
PROJ_NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
RUNTIME_SA="${PROJ_NUM}-compute@developer.gserviceaccount.com"
for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" --role="$role" --condition=None >/dev/null
done

# ── 6) Build + push backend image ────────────────────────────────────────────
echo "==> Building backend image $IMAGE"
gcloud builds submit backend --tag "$IMAGE"

# ── 7) Deploy to Cloud Run ───────────────────────────────────────────────────
DS_URL="jdbc:postgresql:///${DB_NAME}?cloudSqlInstance=${CONN}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
echo "==> Deploying $SERVICE"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" --region "$REGION" --allow-unauthenticated \
  --add-cloudsql-instances "$CONN" \
  --set-env-vars "^##^SPRING_PROFILES_ACTIVE=dev##FIREBASE_PROJECT_ID=${PROJECT}##FIREBASE_SERVICE_ACCOUNT_PATH=file:/secrets/firebase.json##SPRING_DATASOURCE_URL=${DS_URL}##SPRING_DATASOURCE_USERNAME=${DB_USER}" \
  --set-secrets "/secrets/firebase.json=firebase-sa-dev:latest,SPRING_DATASOURCE_PASSWORD=db-pass-dev:latest,JWT_SECRET=jwt-secret-dev:latest"

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
