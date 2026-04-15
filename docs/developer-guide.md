# Aranya CRM Developer Guide

## 1. What This Project Is

Aranya CRM is a full-stack internal CRM system with:

- `frontend/`: React + TypeScript + Vite + Ant Design
- `backend/`: Spring Boot 3 + Spring Security + JPA + Liquibase
- `infra/docker/`: local Docker Compose setup for PostgreSQL and app containers
- `docs/`: project notes, API notes, and supporting materials

At the moment, the project is partially implemented:

- login flow exists
- dashboard API exists
- client/case/report pages exist in the frontend
- many frontend modules still support mock data fallback
- the backend currently exposes only a small set of real endpoints

This guide is meant to help a new contributor run, understand, and continue developing the project safely.

## 2. Repository Layout

### Root

- `README.md`: basic project intro and old local DB notes
- `docs/01-api-spec.md`: placeholder API spec file
- `docs/meeting_notes/`: historical project notes

### Frontend

- `frontend/src/main.tsx`: app bootstrap
- `frontend/src/App.tsx`: current route entry
- `frontend/src/pages/`: feature pages
- `frontend/src/components/layout/`: shared app shell and navigation
- `frontend/src/services/`: API calls, auth helpers, mock/api switching
- `frontend/src/mocks/`: local demo/mock datasets
- `frontend/src/types/`: shared frontend type definitions
- `frontend/vite.config.ts`: local dev proxy config
- `frontend/nginx.conf`: production static hosting + `/api` reverse proxy
- `frontend/Dockerfile`: frontend image build

### Backend

- `backend/src/main/java/aranya/crm/controller/`: HTTP controllers
- `backend/src/main/java/aranya/crm/service/`: application logic
- `backend/src/main/java/aranya/crm/security/`: JWT and Spring Security wiring
- `backend/src/main/java/aranya/crm/entity/`: JPA entities
- `backend/src/main/java/aranya/crm/repository/`: data access layer
- `backend/src/main/resources/application*.yml`: environment config
- `backend/src/main/resources/db/changelog/`: Liquibase migrations
- `backend/Dockerfile`: backend image build
- `backend/pom.xml`: Maven dependencies

### Infrastructure

- `infra/docker/docker-compose.yaml`: local multi-container dev stack
- `infra/docker/.env`: compose secrets and environment values

## 3. Tech Stack

### Frontend

- React 19
- TypeScript
- Vite 8
- React Router
- Axios
- Redux Toolkit is installed, but current app flow is still mostly service-driven
- Ant Design 6

### Backend

- Java 17
- Spring Boot 3.5
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL
- Liquibase
- JWT via `jjwt`
- springdoc OpenAPI UI

## 4. Current Functional Scope

### Implemented or partially implemented

- authentication endpoints:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- dashboard endpoint:
  - `GET /api/dashboard`
- frontend pages:
  - login
  - dashboard
  - clients
  - cases
  - reports

### Important current reality

Only `AuthController` and `DashboardController` are present in the backend right now. That means:

- login is real
- dashboard is real, but currently returns hard-coded demo data
- many other frontend pages are not backed by real backend endpoints yet
- those pages rely on frontend-side mock data in `frontend/src/mocks/`

## 5. How To Run The Project

## 5.1 Frontend only

Requirements:

- Node.js 22 is recommended because the Docker build also uses `node:22-alpine`

Commands:

```bash
cd frontend
npm ci
npm run dev
```

Default local URL:

- `http://localhost:5173`

Local API behavior:

- Vite proxies `/api` to `http://localhost:8080`
- this is configured in `frontend/vite.config.ts`

## 5.2 Backend only

Requirements:

- Java 17
- Maven 3.9+
- PostgreSQL running locally or through Docker

Typical local flow:

```bash
cd backend
mvn spring-boot:run
```

Default dev profile behavior:

- profile: `dev`
- datasource defaults to `jdbc:postgresql://localhost:5432/aranya_crm`
- username defaults to `aranya_admin`
- password defaults to `aranya_secret`
- JWT secret must be provided through environment variable `JWT_SECRET`

Example:

```powershell
$env:JWT_SECRET="replace-with-a-long-random-secret"
cd backend
mvn spring-boot:run
```

Default backend URL:

- `http://localhost:8080`

## 5.3 Database only

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d postgres
```

Default DB settings:

- database: `aranya_crm`
- username: `aranya_admin`
- password: `aranya_secret`
- port: `5432`

Liquibase runs on backend startup and applies schema changes from:

- `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
- included files under `backend/src/main/resources/db/changelog/changes/`

## 5.4 Full stack with Docker Compose

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yaml up --build
```

Expected URLs:

- frontend: `http://localhost`
- backend: `http://localhost:8080`
- postgres: `localhost:5432`

How traffic works in Docker:

- frontend is served by Nginx
- Nginx proxies `/api` to service name `backend:8080`
- backend connects to PostgreSQL at `postgres:5432`

## 6. Frontend Architecture Notes

### Routing

Current top-level routes in `frontend/src/App.tsx`:

- `/login`
- `/dashboard`

The project already contains additional feature pages under `pages/`, but not all are currently wired into the top-level route tree.

### API access

Shared Axios client:

- `frontend/src/services/http.ts`

Default API base URL:

- `VITE_API_BASE_URL`
- falls back to `/api`

### Mock vs API mode

The frontend currently supports mixed data strategies:

- dashboard uses `VITE_DASHBOARD_DATA_MODE`
- clients, cases, and reports use `VITE_DATA_MODE`

Accepted values:

- `mock`
- `api`
- `auto`

Current behavior:

- `mock`: always use local mock data
- `api`: always call backend
- `auto`: try API first or fall back to mock depending on the service implementation

This is useful during incremental backend development.

### Authentication

Frontend auth helpers live in:

- `frontend/src/services/auth.ts`
- `frontend/src/contexts/AuthContext.tsx`

Current implementation stores tokens and user identity in `localStorage`.

Important note:

- there is a current mismatch between `AuthContext.tsx` and `services/auth.ts`
- `AuthContext` expects a user role, but the auth service currently does not persist or return one
- strict TypeScript build currently fails because of this mismatch
- Docker frontend build was temporarily adjusted to use `npm run build:docker`, which skips the TypeScript compile step and runs only `vite build`

This should be treated as temporary technical debt and should be fixed properly later.

## 7. Backend Architecture Notes

### Security

Security is JWT-based and mainly wired through:

- `backend/src/main/java/aranya/crm/security/config/SecurityConfig.java`
- `backend/src/main/java/aranya/crm/security/filter/JwtAuthFilter.java`
- `backend/src/main/java/aranya/crm/security/util/JwtUtil.java`
- `backend/src/main/java/aranya/crm/security/model/UserPrincipal.java`

### Authentication flow

Backend auth flow:

1. login request enters `AuthController`
2. `AuthService` authenticates against Spring Security
3. access token and refresh token are generated
4. refresh token hash is persisted
5. response returns token data and basic user info

Current response includes:

- `accessToken`
- `refreshToken`
- `tokenType`
- `expiresIn`
- `email`
- `fullName`

Current response does not include role information.

### Database model

Liquibase changelogs indicate the domain already includes:

- roles
- users
- user-role mapping
- invitations
- clients
- related contacts
- cases
- case status history
- case assignment
- case notes
- appointments
- documents
- refresh tokens

This means the schema design is ahead of the current controller implementation.

## 8. Development Workflows

## 8.1 Adding a new backend feature

Recommended order:

1. add or update Liquibase migration if schema changes are needed
2. create or update entity/repository/service/controller
3. expose endpoint under `/api/...`
4. update frontend service file in `frontend/src/services/`
5. replace mock fallback gradually
6. add tests

## 8.2 Adding a new frontend feature page

Recommended order:

1. add or update types under `frontend/src/types/`
2. create service access in `frontend/src/services/`
3. decide whether the page supports mock mode, API mode, or both
4. build page under `frontend/src/pages/`
5. wire route into `App.tsx` or the shared layout route tree
6. validate both local Vite dev mode and Docker/Nginx serving mode

## 8.3 Updating database schema

Rules to follow:

- create a new numbered file under `backend/src/main/resources/db/changelog/changes/`
- do not rewrite already-applied migrations casually
- let Liquibase apply changes automatically on backend startup

## 9. Docker Notes

### Frontend image

Frontend Docker build uses:

- build stage: Node 22
- runtime stage: Nginx Alpine

Static files are copied from Vite output `dist/` into:

- `/usr/share/nginx/html`

SPA routing is supported by:

- `try_files $uri $uri/ /index.html;`

API proxying is handled by:

- `location /api { proxy_pass http://backend:8080; }`

### Backend image

Backend Docker build:

- builds with Maven and Java 17
- packages a jar
- runs with Eclipse Temurin 17 JRE

### Compose notes

Current compose file starts:

- `postgres`
- `backend`
- `frontend`

The current compose file has already been corrected so that:

- `backend` and `frontend` are under `services`
- backend and frontend join `aranya_network`
- backend maps `8080:8080`

## 10. Known Issues And Risks

### Known issue: frontend TypeScript build is not clean

There is an unresolved mismatch between:

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/services/auth.ts`

Impact:

- `npm run build` fails because it runs `tsc -b`
- Docker currently avoids this by using `npm run build:docker`

Recommended long-term fix:

- decide the canonical user auth payload
- include role in backend login response if role-based UI is required
- persist role in frontend auth storage
- align `AuthContext`, `services/auth.ts`, and the backend DTO

### Known issue: docs are still sparse

- `docs/01-api-spec.md` is still a placeholder
- API surface is not fully documented yet

### Known issue: backend feature coverage is incomplete

- frontend already contains more pages than the backend currently supports
- several frontend service modules still depend on mock data or fallback behavior

## 11. Recommended Next Improvements

- fix the auth role mismatch properly instead of relying on the temporary Docker build workaround
- add real backend endpoints for clients, cases, and reports
- expand route wiring so all frontend pages are reachable through the router
- replace placeholder API spec with real endpoint contracts
- add integration tests for login, refresh token flow, and dashboard
- add a top-level `.env.example` or per-module environment examples
- document seed data or provide sample test users

## 12. Quick Start For New Contributors

If you are joining the project and want the fastest working setup:

1. start PostgreSQL with Docker Compose
2. set `JWT_SECRET`
3. run backend locally on `8080`
4. run frontend locally on `5173`
5. use frontend mock modes for unfinished modules
6. treat Docker frontend build as deploy packaging, not as proof that TypeScript is clean

If you want the most stable development path, start with the login flow and dashboard, because those are the parts that already have both frontend and backend pieces in place.
