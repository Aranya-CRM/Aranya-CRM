# Aranya-CRM

Internal CRM for the Aranya organization — case and client management for monastic support services.

- **Frontend**: React 19 + TypeScript + Vite + Ant Design 6
- **Backend**: Java 17 + Spring Boot 3 + JPA + Liquibase
- **Database**: PostgreSQL 15
- **Auth**: Firebase (identity + TOTP) with roles/permissions stored locally

## Documentation

For onboarding, local setup, architecture notes, and ongoing development guidance, start here:

- [Developer Guide](docs/System%20Design/developer-guide.md)
- [API Spec](docs/System%20Design/01-api-spec.md)

## Running with Docker Compose

Everything (database, backend, frontend, admin server) is defined in `infra/docker/docker-compose.yaml`.

Start the full stack:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build
```

| Service | URL | Container |
|---------|-----|-----------|
| Frontend | http://localhost | `aranya_crm_frontend_dev` |
| Backend | http://localhost:8080 | `aranya_crm_backend_dev` |
| Admin server | http://localhost:9090 | `aranya_crm_admin_dev` |
| PostgreSQL | `localhost:5432` | `aranya_crm_dev` |

Rebuild a single service after changing its code:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build frontend
docker compose -f infra/docker/docker-compose.yaml up -d --build backend
```

Database only (when running backend/frontend from your IDE):

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d postgres
```

Stop everything:

```powershell
docker compose -f infra/docker/docker-compose.yaml down
```

Reset the database (drops the volume — all local data is lost, migrations re-run from scratch):

```powershell
docker compose -f infra/docker/docker-compose.yaml down -v
docker compose -f infra/docker/docker-compose.yaml up -d
```

## Running locally without Docker

Frontend:

```powershell
cd frontend
npm ci
npm run dev        # http://localhost:5173
```

Backend (requires PostgreSQL running and secrets in place):

```powershell
cd backend
mvn spring-boot:run
```

## Local database credentials

Fixed dev credentials, set in `infra/docker/docker-compose.yaml`:

- Database: `aranya_crm`
- Username: `aranya_admin`
- Password: `aranya_secret`
- Port: `5432`
- Data volume: `aranya_crm_data`

## Database schema

The schema is managed by **Liquibase**, not by Hibernate (`spring.jpa.hibernate.ddl-auto=none`). Migrations live in
`backend/src/main/resources/db/changelog/changes/` and run automatically on backend startup.

Always add a **new numbered changelog file** for schema changes — never edit a migration that has already been applied.

## Required local secrets (never commit)

| File | Purpose |
|------|---------|
| `frontend/.env` | Firebase web app config (`VITE_FIREBASE_*`) |
| `backend/.env` | Backend secrets (`JWT_SECRET`, `FIREBASE_PROJECT_ID`, …) |
| `backend/src/main/resources/firebase-service-account-dev.json` | Firebase Admin SDK credentials |

## Optional integrations

Both are disabled by default and degrade safely when off:

- **Google Calendar** (`GOOGLE_CALENDAR_ENABLED`) — mirrors case service events to shared calendars.
- **Google Drive** (`GOOGLE_DRIVE_ENABLED`) — document import.
