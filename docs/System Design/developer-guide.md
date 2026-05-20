# Aranya CRM Developer Guide

## 1. What This Project Is

Aranya CRM is a full-stack internal CRM system with:

- `frontend/`: React + TypeScript + Vite + Ant Design
- `backend/`: Spring Boot 3 + Spring Security + JPA + Liquibase
- `infra/docker/`: local Docker Compose setup for PostgreSQL and app containers
- `scripts/`: project automation scripts, including Firebase project setup helpers
- `docs/`: project notes, API notes, and supporting materials

Current implementation status:

- Firebase Auth is the source of authentication.
- Frontend supports email/password login, Google login, email verification, and TOTP MFA.
- Backend verifies Firebase ID tokens and enforces completed TOTP MFA.
- Backend uses the local database for CRM users, roles, permissions, and account status.
- Dashboard API reads current client, case, and report summary data.
- User-management APIs exist for managers, with limitations noted below.
- Client and case read APIs exist. Client and case frontend services still keep mock fallback behavior for local development.
- Report pages exist in the frontend and still rely on mock/fallback behavior.

## 2. Repository Layout

### Root

- `README.md`: project intro
- `docs/01-api-spec.md`: current API contract
- `docs/developer-guide.md`: this guide
- `scripts/firebase/enable-totp-mfa.mjs`: enables TOTP MFA for the Firebase project through Google Identity Toolkit Admin API

### Frontend

- `frontend/src/main.tsx`: app bootstrap
- `frontend/src/App.tsx`: route entry
- `frontend/src/pages/`: feature pages
- `frontend/src/pages/login/`: Firebase login and MFA UI
- `frontend/src/components/layout/`: shared app shell and navigation
- `frontend/src/services/firebase.ts`: Firebase client initialization
- `frontend/src/services/auth.ts`: Firebase auth helpers
- `frontend/src/services/http.ts`: Axios client that attaches Firebase ID tokens
- `frontend/src/services/`: API service modules
- `frontend/src/mocks/`: local demo/mock datasets
- `frontend/src/types/`: shared frontend type definitions
- `frontend/vite.config.ts`: local dev proxy config
- `frontend/nginx.conf`: production static hosting and `/api` reverse proxy
- `frontend/Dockerfile`: frontend image build

### Backend

- `backend/src/main/java/aranya/crm/controller/`: HTTP controllers
- `backend/src/main/java/aranya/crm/service/`: application logic
- `backend/src/main/java/aranya/crm/security/`: Firebase auth filter, current-user annotation, Spring Security config
- `backend/src/main/java/aranya/crm/config/FirebaseConfig.java`: Firebase Admin SDK initialization
- `backend/src/main/java/aranya/crm/entity/`: JPA entities
- `backend/src/main/java/aranya/crm/repository/`: data access layer
- `backend/src/main/resources/application*.yml`: environment config
- `backend/src/main/resources/db/changelog/`: Liquibase migrations
- `backend/.env`: local backend env values used by Docker Compose; ignored by Git
- `backend/Dockerfile`: backend image build
- `backend/pom.xml`: Maven dependencies

### Infrastructure

- `infra/docker/docker-compose.yaml`: local multi-container dev stack
- `infra/docker/.env`: ignored local compose env file if needed

## 3. Tech Stack

### Frontend

- React 19
- TypeScript
- Vite 8
- React Router
- Axios
- Firebase JavaScript SDK
- `qrcode` for rendering Firebase TOTP enrollment URI as a QR code
- Redux Toolkit is installed, but current app flow is mostly service-driven
- Ant Design 6

### Backend

- Java 17
- Spring Boot 3.5
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL
- Liquibase
- Firebase Admin SDK
- springdoc OpenAPI UI

Legacy JWT and custom 2FA configuration keys may still exist in config classes or YAML while the migration is in progress, but the active authentication path is Firebase ID token verification.

## 4. Authentication Model

Authentication is split deliberately:

- Firebase handles identity, password/Google provider login, email verification, and TOTP MFA.
- The backend verifies the final Firebase ID token.
- The local database decides whether that Firebase user is allowed to use this CRM.
- Local roles and permissions are loaded after authentication and used for authorization and UI capabilities.

The backend accepts a request only when all of these are true:

1. `Authorization: Bearer <firebase-id-token>` is present.
2. Firebase Admin SDK verifies the token.
3. `email_verified` is true.
4. Firebase token claim `firebase.sign_in_second_factor` is `totp`.
5. Token UID exists in `users.firebase_uid`.
6. Local user status is `ACTIVE`.

After that, `FirebaseAuthFilter` stores the local `User` entity as the Spring Security principal:

```java
new UsernamePasswordAuthenticationToken(user, null, authorities)
```

Controllers can read it with:

```java
public ResponseEntity<MeResponse> me(@CurrentUser User user)
```

Role authorities are local Spring Security authorities such as:

```text
ROLE_MANAGER
ROLE_SOCIAL_WORKER
ROLE_VOLUNTEER
```

## 5. Current Functional Scope

Implemented backend endpoints:

- `GET /api/v1/auth/me`
- `GET /api/v1/ui/manifest`
- `GET /api/v1/dashboard`
- `GET /api/v1/users`
- `POST /api/v1/users/invite`
- `PATCH /api/v1/users/{id}/roles`
- `PATCH /api/v1/users/{id}/status`
- `DELETE /api/v1/users/{id}`
- `GET /api/v1/clients`
- `GET /api/v1/clients/{id}`
- `GET /api/v1/cases`
- `GET /api/v1/cases/{id}`

Frontend pages:

- login
- dashboard
- clients
- cases
- reports

Important limitations:

- Backend does not expose custom login, refresh-token, logout, or custom 2FA APIs.
- User invite currently creates only a local database user. It does not create a Firebase Auth user or assign `firebase_uid`.
- Client create/update APIs are not complete yet.
- Case create, notes, and status-history APIs are not complete yet.
- Report backend APIs are not complete yet.

## 6. Environment And Secret Files

Do not commit these files:

- `frontend/.env`
- `backend/.env`
- `infra/docker/.env`
- `backend/src/main/resources/firebase-service-account-*.json`
- private keys, certificates, keystores, or Google credentials JSON files

These are covered by `.gitignore` and module-level ignore files.

### Frontend `.env`

Create `frontend/.env` locally with Firebase Web App config:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Where to get it:

1. Open Firebase Console.
2. Select the project.
3. Go to Project settings.
4. In "Your apps", create or select the Web App.
5. Copy the `firebaseConfig` values.

### Backend `.env`

Create `backend/.env` locally for Docker Compose. At minimum it should contain secrets required by currently loaded configuration.

Example:

```text
JWT_SECRET=replace-with-long-random-dev-secret
TWO_FACTOR_ENCRYPTION_KEY=QXJhbnlhQ1JNMkZBRGV2S2V5Rm9yVGVzdGluZzEyMzQ=
FIREBASE_PROJECT_ID=aranya-crm-dev
```

JWT and custom 2FA keys are legacy config values that may still be read by application properties. They are not the active login mechanism.

### Firebase Service Account

For local development, put the Firebase service account JSON at:

```text
backend/src/main/resources/firebase-service-account-dev.json
```

This file is ignored by Git and excluded from backend Docker image builds.

Docker Compose mounts it at runtime:

```text
/run/secrets/firebase-service-account-dev.json
```

The backend reads it through:

```text
FIREBASE_SERVICE_ACCOUNT_PATH=file:/run/secrets/firebase-service-account-dev.json
```

This keeps the service account out of the built image.

## 7. Firebase Project Setup

In Firebase Console:

1. Enable Authentication.
2. Enable Email/Password provider.
3. Enable Google provider.
4. Enable Identity Platform if TOTP MFA is not available in the normal Firebase Auth UI.
5. Make sure authorized domains include your local frontend domain if needed, such as `localhost`.

### Enable TOTP MFA

The project has a persistent script:

```text
scripts/firebase/enable-totp-mfa.mjs
```

Run it from `frontend/`:

```powershell
cd frontend
npm run firebase:enable-totp
```

Default behavior:

- service account path: `../backend/src/main/resources/firebase-service-account-dev.json`
- project id: from `FIREBASE_PROJECT_ID`, otherwise `aranya-crm-dev`
- adjacent TOTP intervals: from `FIREBASE_TOTP_ADJACENT_INTERVALS`, otherwise `5`

Override example:

```powershell
$env:FIREBASE_PROJECT_ID="your-project-id"
$env:FIREBASE_SERVICE_ACCOUNT_PATH="..\backend\src\main\resources\firebase-service-account-dev.json"
$env:FIREBASE_TOTP_ADJACENT_INTERVALS="5"
npm run firebase:enable-totp
```

The script is stored permanently because TOTP setup is project configuration, not application runtime logic. Keeping it in the repo lets future developers re-apply or audit the Firebase MFA setup without relying on console-only steps.

## 8. Login Flow

### Email/password

1. User enters email and password.
2. Frontend calls Firebase SDK `signInWithEmailAndPassword`.
3. If email is not verified, frontend shows the verification step.
4. If TOTP is not enrolled, frontend starts Firebase TOTP enrollment.
5. Frontend renders the Firebase `otpauth://` URI as a QR code.
6. User scans the QR code with an authenticator app and enters the 6-digit code.
7. Frontend enrolls the TOTP factor with Firebase.
8. User signs in again and completes the TOTP challenge.
9. Frontend calls backend `/api/v1/auth/me` and `/api/v1/ui/manifest`.
10. Backend verifies the Firebase ID token and grants access if the local user is valid.

### Google login

1. User clicks "Continue with Google".
2. Frontend calls Firebase SDK `signInWithPopup` using `GoogleAuthProvider`.
3. The remaining email verification, TOTP, backend `/me`, and UI manifest checks are the same.

### Logout

Logout is Firebase client sign-out:

```ts
await signOut(firebaseAuth)
```

The backend is stateless and does not store sessions or refresh tokens.

## 9. How To Run The Project

## 9.1 Frontend only

Requirements:

- Node.js 22 is recommended because the Docker build uses `node:22-alpine`.
- `frontend/.env` must contain Firebase web config.

Commands:

```bash
cd frontend
npm ci
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

Vite proxies `/api` to:

```text
http://localhost:8080
```

## 9.2 Backend only

Requirements:

- Java 17
- Maven 3.9+
- PostgreSQL running locally or through Docker
- Firebase service account JSON available locally

Typical local flow:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="classpath:firebase-service-account-dev.json"
$env:FIREBASE_PROJECT_ID="aranya-crm-dev"
cd backend
mvn spring-boot:run
```

Default dev datasource:

- URL: `jdbc:postgresql://localhost:5432/aranya_crm`
- username: `aranya_admin`
- password: `aranya_secret`

Default backend URL:

```text
http://localhost:8080
```

## 9.3 Database only

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

## 9.4 Full stack with Docker Compose

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build
```

Expected URLs:

- frontend: `http://localhost`
- backend: `http://localhost:8080`
- postgres: `localhost:5432`

How traffic works in Docker:

- frontend is served by Nginx
- Nginx proxies `/api` to service name `backend:8080`
- backend connects to PostgreSQL at `postgres:5432`
- backend reads service account credentials from the runtime bind mount at `/run/secrets/firebase-service-account-dev.json`

## 10. Frontend Architecture Notes

### Routing

Current top-level routes include:

- `/login`
- `/dashboard`
- feature routes for clients, cases, and reports through the app layout

### API access

Shared Axios client:

```text
frontend/src/services/http.ts
```

Default API base URL:

```text
VITE_API_BASE_URL
```

Fallback:

```text
/api
```

The Axios request interceptor calls `getFirebaseIdToken()` and attaches:

```http
Authorization: Bearer <firebase-id-token>
```

### Authentication files

- `frontend/src/services/firebase.ts`: creates Firebase app and auth instance
- `frontend/src/services/auth.ts`: Firebase auth operations
- `frontend/src/contexts/AuthContext.tsx`: subscribes to Firebase auth state and loads backend profile/manifest
- `frontend/src/pages/login/LoginPage.tsx`: login, verification, TOTP challenge, and TOTP enrollment UI

The login page handles these states:

- `credentials`
- `email-verification`
- `totp-challenge`
- `totp-enrollment`

TOTP enrollment displays:

- QR code generated from Firebase's `otpauth://` URI
- manual setup key as fallback

### Mock vs API mode

The frontend still supports mixed data strategies:

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

Current client/case data notes:

- Client list/detail reads from `/api/v1/clients` and `/api/v1/clients/{id}` when API mode is available.
- Client membership status is currently presented in the frontend as `Active` for all client profiles, and the client profile page does not expose membership-status filtering.
- Case list/detail reads from `/api/v1/cases` and `/api/v1/cases/{id}` when API mode is available.
- Case notes and status history still fall back to mock data until backend endpoints are added.

## 11. Backend Architecture Notes

### Security

Security is Firebase-token-based and mainly wired through:

- `backend/src/main/java/aranya/crm/security/config/SecurityConfig.java`
- `backend/src/main/java/aranya/crm/security/filter/FirebaseAuthFilter.java`
- `backend/src/main/java/aranya/crm/security/annotation/CurrentUser.java`
- `backend/src/main/java/aranya/crm/security/annotation/CurrentUserArgumentResolver.java`
- `backend/src/main/java/aranya/crm/config/FirebaseConfig.java`
- `backend/src/main/java/aranya/crm/config/FirebaseProperties.java`

`SecurityConfig`:

- disables CSRF
- configures CORS
- uses stateless sessions
- allows public health/docs routes
- requires authentication for everything else
- registers `FirebaseAuthFilter` before `UsernamePasswordAuthenticationFilter`

`FirebaseAuthFilter`:

- extracts the Bearer token
- verifies it with Firebase Admin SDK
- checks email verification
- checks TOTP second factor claim
- loads the local user by Firebase UID with roles
- checks local account status
- syncs Firebase email verification/name fields into local user data
- builds Spring Security authorities from local roles

### Current user access

Use `@CurrentUser` in controllers:

```java
@GetMapping("/me")
public ResponseEntity<MeResponse> me(@CurrentUser User user) {
    return ResponseEntity.ok(userService.getCurrentUser(user));
}
```

This works because the authentication principal is the local `User` entity.

### Authorization

Role checks use local roles:

```java
@PreAuthorize("hasRole('MANAGER')")
```

Current user-management controller is class-level restricted to `MANAGER`:

```java
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('MANAGER')")
```

The UI manifest endpoint is authenticated and returns capability lists derived from local permissions:

```json
{
  "routes": [],
  "features": [],
  "widgets": []
}
```

## 12. Database Model Notes

Important auth-related local fields:

- `users.firebase_uid`
- `users.email`
- `users.email_verified`
- `users.status`
- `role.name`
- `user_role`
- `permission`
- `role_permission`

The local `users` table must be linked to Firebase Auth by UID. A Firebase user who is not present in the local database cannot access protected backend APIs.

Seed data in dev migrations may create local users and roles, but real Firebase Auth users still need to exist separately.

Current dev seed notes:

- `025-seed-dev-client-case-data.yaml` seeds sample clients for local client filtering and display.
- `027-seed-dev-case-data.yaml` reliably seeds four sample cases linked to the clients from `025`.
- `027` chooses an existing `created_by` actor, preferring `socialworker@test.com`, then `aranya.crm.admin@gmail.com`, then any existing user. This avoids the earlier issue where a missing `admin@test.com` caused case inserts to select zero rows.

## 13. Development Workflows

## 13.1 Adding a Firebase-authenticated backend endpoint

Recommended order:

1. Add controller/service/repository code.
2. Keep endpoint under `/api/...`.
3. Decide whether it only needs authentication or also role authorization.
4. Use `@CurrentUser User user` when current local user data is needed.
5. Add `@PreAuthorize(...)` for role-specific operations.
6. Update the frontend service module.
7. Update `docs/01-api-spec.md`.

## 13.2 Adding a new frontend feature page

Recommended order:

1. Add or update types under `frontend/src/types/`.
2. Create service access in `frontend/src/services/`.
3. Decide whether the page supports mock mode, API mode, or both.
4. Build page under `frontend/src/pages/`.
5. Wire route into `App.tsx` or the shared layout route tree.
6. Validate both local Vite dev mode and Docker/Nginx serving mode.

## 13.3 Updating database schema

Rules:

- Create a new numbered file under `backend/src/main/resources/db/changelog/changes/`.
- Do not rewrite already-applied migrations casually.
- Let Liquibase apply changes automatically on backend startup.

Do not store service account data, Firebase secrets, plaintext passwords, or private keys in migrations or seed data.

## 13.4 Updating Docker images after code changes

When frontend or backend runtime code changes, rebuild and restart the corresponding Docker service before handing off the change.

Frontend-only changes:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build frontend
```

Backend-only changes:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build backend
```

Full-stack or shared contract changes:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build
```

Confirm status after rebuilding:

```powershell
docker compose -f infra/docker/docker-compose.yaml ps
```

## 14. Docker Notes

### Frontend image

Frontend Docker build uses:

- build stage: Node 22
- runtime stage: Nginx Alpine

Static files are copied from Vite output `dist/` into:

```text
/usr/share/nginx/html
```

SPA routing is supported by:

```nginx
try_files $uri $uri/ /index.html;
```

API proxying is handled by:

```nginx
location /api { proxy_pass http://backend:8080; }
```

### Backend image

Backend Docker build:

- builds with Maven and Java 17
- packages a jar
- runs with Eclipse Temurin 17 JRE
- excludes Firebase service account JSON through `backend/.dockerignore`

### Compose notes

Current compose file starts:

- `postgres`
- `backend`
- `frontend`

Backend container configuration:

- reads `backend/.env`
- sets dev datasource env vars
- sets `FIREBASE_SERVICE_ACCOUNT_PATH=file:/run/secrets/firebase-service-account-dev.json`
- bind-mounts the local service account JSON as read-only

## 15. Known Issues And Risks

- User invite does not create or link Firebase Auth users yet.
- Some legacy JWT/custom 2FA config and DTO/test artifacts may still exist while the Firebase migration is being cleaned up.
- Client write APIs are incomplete.
- Case write, notes, and status-history APIs are incomplete.
- Report backend APIs are incomplete.
- Role and permission UI is moving toward `/api/v1/ui/manifest`; individual backend endpoints must still enforce authorization.
- Service account JSON is required locally but must never be committed or baked into images.
- Firebase TOTP MFA must be enabled at the Firebase/Identity Platform project level, otherwise enrollment returns `auth/operation-not-allowed`.

## 16. Recommended Next Improvements

- Clean up remaining legacy JWT and custom 2FA code/tests/config once Firebase auth is stable.
- Add a proper admin flow to create Firebase Auth users and link local `users.firebase_uid`.
- Add `.env.example` files for frontend and backend.
- Add integration tests for `FirebaseAuthFilter` behavior.
- Add client write APIs.
- Add case write, notes, status-history, and assignment-aware authorization APIs.
- Add report backend APIs.
- Expand route wiring so all frontend pages are consistently reachable.
- Add account settings for re-enrolling or removing TOTP factors through Firebase.

## 17. Quick Start For New Contributors

Fastest path to a working local stack:

1. Put Firebase Web App config in `frontend/.env`.
2. Put Firebase service account JSON at `backend/src/main/resources/firebase-service-account-dev.json`.
3. Put local backend secrets in `backend/.env`.
4. Enable Firebase Email/Password and Google providers.
5. Enable TOTP MFA with:

```powershell
cd frontend
npm run firebase:enable-totp
```

6. Start the full stack:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d --build
```

7. Create a Firebase Auth user and link its UID to a local `users.firebase_uid` row.
8. Open:

```text
http://localhost
```
