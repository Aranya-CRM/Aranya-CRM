# Aranya CRM Developer Guide

## 1. What This Project Is

Aranya CRM is a full-stack internal CRM system with:

- `frontend/`: React + TypeScript + Vite + Ant Design
- `backend/`: Spring Boot 3 + Spring Security + JPA + Liquibase
- `infra/docker/`: local Docker Compose setup for PostgreSQL and app containers
- `docs/`: project notes, API notes, and supporting materials

At the moment, the project is partially implemented:

- login flow exists
- two-factor authentication (2FA) exists on the backend
- dashboard API exists
- client/case/report pages exist in the frontend
- many frontend modules still support mock data fallback
- the backend currently exposes auth, 2FA, and dashboard endpoints

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
- `backend/.env`: local backend secret values used by Docker Compose
- `backend/Dockerfile`: backend image build
- `backend/pom.xml`: Maven dependencies

### Infrastructure

- `infra/docker/docker-compose.yaml`: local multi-container dev stack
- `infra/docker/.env`: older compose env file kept in the repo, but the current backend container setup reads `backend/.env`

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
- TOTP-based 2FA via `dev.samstevens.totp`
- springdoc OpenAPI UI

## 4. Current Functional Scope

### Implemented or partially implemented

- authentication endpoints:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- two-factor authentication endpoints:
  - `GET /api/v1/auth/2fa/setup`
  - `POST /api/v1/auth/2fa/enable`
  - `POST /api/v1/auth/2fa/verify`
  - `POST /api/v1/auth/2fa/disable`
  - `POST /api/v1/auth/2fa/backup-codes`
- dashboard endpoint:
  - `GET /api/dashboard`
- frontend pages:
  - login
  - dashboard
  - clients
  - cases
  - reports

### Important current reality

`AuthController`, `TwoFactorController`, and `DashboardController` are present in the backend right now. That means:

- login is real
- 2FA setup, enable, login verification, disable, and backup-code regeneration are real backend flows
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
- 2FA secret encryption uses `TWO_FACTOR_ENCRYPTION_KEY`
  - dev profile has a default test key
  - production must provide a Base64-encoded 32-byte key

Example:

```powershell
$env:JWT_SECRET="replace-with-a-long-random-secret"
$env:TWO_FACTOR_ENCRYPTION_KEY="replace-with-base64-encoded-32-byte-key"
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
docker compose -f infra/docker/docker-compose.yaml up --build
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
`AuthProvider` is mounted at the application root in `frontend/src/main.tsx`, so routed pages can safely use `useAuth()`.

Important note:

- the frontend is currently aligned to the backend's actual auth response and only treats `email` and `fullName` as canonical user identity fields
- role-based UI is temporarily running in a compatibility mode until the backend starts returning role information
- frontend login is not yet fully wired for backend 2FA responses; `requiresTwoFactor` and `tempToken` still need login-page handling before users with 2FA enabled can complete sign-in through the UI
- Docker frontend build was temporarily adjusted to use `npm run build:docker`, which skips the TypeScript compile step and runs only `vite build`

This should be treated as temporary technical debt and should be fixed properly later.

## 7. Backend Architecture Notes

### Security

Security is JWT-based and mainly wired through:

- `backend/src/main/java/aranya/crm/security/config/SecurityConfig.java`
- `backend/src/main/java/aranya/crm/security/filter/JwtAuthFilter.java`
- `backend/src/main/java/aranya/crm/security/util/JwtUtil.java`
- `backend/src/main/java/aranya/crm/security/model/UserPrincipal.java`

2FA-specific backend classes:

- `backend/src/main/java/aranya/crm/controller/TwoFactorController.java`
- `backend/src/main/java/aranya/crm/service/TwoFactorService.java`
- `backend/src/main/java/aranya/crm/dto/TwoFactorSetupResponse.java`
- `backend/src/main/java/aranya/crm/dto/TwoFactorEnableRequest.java`
- `backend/src/main/java/aranya/crm/dto/TwoFactorVerifyRequest.java`
- `backend/src/main/java/aranya/crm/dto/TwoFactorDisableRequest.java`
- `backend/src/main/java/aranya/crm/dto/BackupCodesResponse.java`

### Authentication flow

Backend auth flow:

1. login request enters `AuthController`
2. `AuthService` authenticates against Spring Security
3. if the user has 2FA disabled, access token and refresh token are generated
4. refresh token hash is persisted
5. response returns token data and basic user info

If the user has 2FA enabled:

1. login still validates email and password first
2. backend returns `requiresTwoFactor: true` and a short-lived `tempToken`
3. client submits `tempToken` plus either a TOTP code or a backup code to `POST /api/v1/auth/2fa/verify`
4. successful 2FA verification returns the normal login response with access and refresh tokens

Current response includes:

- `accessToken`
- `refreshToken`
- `tokenType`
- `expiresIn`
- `email`
- `fullName`
- `requiresTwoFactor`
- `tempToken`

Current response does not include role information.

### Two-factor authentication flow

2FA uses TOTP with SHA1, 6 digits, and a 30-second period. The verifier allows one time-step of clock discrepancy.

Setup and enable flow:

1. authenticated user calls `GET /api/v1/auth/2fa/setup`
2. backend returns:
   - `secret`
   - `qrCodeUri`
3. client shows the QR URI or secret to the user for an authenticator app
4. user submits `{ "secret": "...", "code": "123456" }` to `POST /api/v1/auth/2fa/enable`
5. backend verifies the code, stores the encrypted TOTP secret, enables 2FA, and returns backup codes

Login verification flow:

1. user logs in with email/password
2. if 2FA is enabled, response contains only `requiresTwoFactor` and `tempToken`
3. user submits `{ "tempToken": "...", "code": "123456" }` or a backup code to `POST /api/v1/auth/2fa/verify`
4. backend returns the normal token response

Disable flow:

1. authenticated user submits `{ "password": "...", "code": "123456" }` to `POST /api/v1/auth/2fa/disable`
2. backend verifies password and 2FA code
3. backend clears the stored 2FA secret and deletes backup codes

Backup-code behavior:

- enabling 2FA creates 8 one-time backup codes
- backup codes are stored as SHA-256 hashes, not plaintext
- a backup code is marked used after successful verification
- authenticated users can regenerate backup codes with `POST /api/v1/auth/2fa/backup-codes`
- regenerated backup codes replace old backup codes

Security notes:

- TOTP secrets are encrypted with AES-GCM before storage
- `TWO_FACTOR_ENCRYPTION_KEY` must decode to exactly 32 bytes
- used OTP values are cached briefly to reduce replay within the accepted time window
- `POST /api/v1/auth/2fa/verify` is public because it authenticates with the temporary 2FA token
- setup, enable, disable, and backup-code regeneration require an access token

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
- user 2FA columns:
  - `users.two_factor_enabled`
  - `users.two_factor_secret`
- 2FA backup codes:
  - `two_factor_backup_code`

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

For 2FA, the relevant migrations are:

- `019-add-2fa-columns-to-users.yaml`
- `020-create-two-factor-backup-codes-table.yaml`

Do not store plaintext TOTP secrets or plaintext backup codes in new migrations or seed data.

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

- `postgres`, `backend`, and `frontend` all join `aranya_network`
- `backend` and `frontend` are under `services`
- backend maps `8080:8080`
- backend loads its JWT secret and production 2FA encryption key from `backend/.env`

## 10. Known Issues And Risks

### Known issue: frontend TypeScript build is not clean

The Docker build path is currently more permissive than the regular local build:

- `npm run build` runs `tsc -b && vite build`
- `npm run build:docker` runs only `vite build`

Impact:

- `npm run build` still fails on frontend TypeScript issues
- Docker currently avoids this by using `npm run build:docker`
- one current example is an unused variable in `frontend/src/components/layout/AppLayout.tsx`

Recommended long-term fix:

- decide the canonical user auth payload
- include role in backend login response if role-based UI is required
- persist role in frontend auth storage
- align `AuthContext`, `services/auth.ts`, and the backend DTO
- remove the temporary UI compatibility code once role information is available

### Known issue: docs are still sparse

- `docs/01-api-spec.md` is still a placeholder
- API surface is not fully documented yet

### Known issue: frontend 2FA flow is not wired yet

- backend can require 2FA during login by returning `requiresTwoFactor` and `tempToken`
- frontend `LoginResponse` currently expects access and refresh tokens immediately
- login UI still needs a second-step code form and calls to `POST /api/v1/auth/2fa/verify`
- account settings UI still needs setup, enable, disable, and backup-code regeneration screens if 2FA is exposed to end users

### Known issue: backend feature coverage is incomplete

- frontend already contains more pages than the backend currently supports
- several frontend service modules still depend on mock data or fallback behavior

## 11. Recommended Next Improvements

- fix the auth role mismatch properly instead of relying on the temporary Docker build workaround
- wire the frontend login flow for 2FA challenge responses
- add an account-security screen for 2FA setup, disable, and backup-code regeneration
- add real backend endpoints for clients, cases, and reports
- expand route wiring so all frontend pages are reachable through the router
- replace placeholder API spec with real endpoint contracts
- add integration tests for login, 2FA verification, refresh token flow, and dashboard
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

If you want the most stable development path, start with the login flow and dashboard, because those are the parts that already have both frontend and backend pieces in place. For 2FA specifically, start with backend API testing first, then wire the frontend second-step login UI.
