# Aranya CRM API Specification

This document describes the API contract currently used by the frontend and backend.

Current status:

- Authentication is handled by Firebase Auth on the frontend.
- The backend does not expose email/password login, refresh-token, logout, or custom 2FA endpoints.
- The backend verifies Firebase ID tokens on protected API requests.
- TOTP MFA is enforced by the backend through Firebase token claims.
- Dashboard and user-management endpoints exist.
- Clients, cases, and reports are still frontend-designed APIs and are not fully implemented by the backend.

## 1. Conventions

### Base URL

Local backend:

```text
http://localhost:8080
```

Frontend service base URL:

```text
/api
```

Example mapping:

- frontend call: `http.get('/v1/auth/me')`
- backend route: `GET /api/v1/auth/me`

### Content Type

Requests and responses use JSON unless otherwise stated.

```http
Content-Type: application/json
```

### Authentication

Protected endpoints require a Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

The token must satisfy the backend filter requirements:

- token is valid according to Firebase Admin SDK
- `email_verified` is true
- Firebase token claim `firebase.sign_in_second_factor` is `totp`
- Firebase UID exists in the local `users.firebase_uid` column
- local user status is `ACTIVE`

The backend loads the local `User` and user roles after token verification. Roles are not part of Firebase authentication itself; they are local authorization data.

Public endpoints:

- `GET /api/health`
- `GET /actuator/health`
- `/api/public/**`
- OpenAPI / Swagger routes
- `/error`

All other endpoints require authentication under the current backend security configuration.

### Firebase Login Flow

The frontend uses Firebase Client SDK for:

- email/password sign-in
- Google sign-in
- email verification
- TOTP MFA enrollment
- TOTP MFA challenge
- sign-out

After Firebase sign-in is complete, the frontend calls:

```http
GET /api/v1/auth/me
GET /api/v1/ui/manifest
```

The shared Axios client in `frontend/src/services/http.ts` attaches the Firebase ID token to API requests.

### Error Shape

Firebase authentication filter errors use:

```json
{
  "code": "INVALID_TOKEN",
  "message": "Invalid or expired Firebase token",
  "timestamp": "2026-05-06T16:00:00+08:00",
  "path": "/api/v1/auth/me"
}
```

Common authentication error codes:

- `INVALID_TOKEN` with HTTP 401
- `EMAIL_NOT_VERIFIED` with HTTP 401
- `MFA_NOT_ENROLLED` with HTTP 428
- `USER_NOT_REGISTERED` with HTTP 403
- `USER_DISABLED` with HTTP 403

Access denied responses may return HTTP 403 for authenticated users without required Spring Security roles.

## 2. Implemented APIs

## 2.1 Authentication

### Get Current User

```http
GET /api/v1/auth/me
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <firebase-id-token>
```

Successful response:

```json
{
  "id": 4,
  "email": "user@example.com",
  "fullName": "Example User"
}
```

Notes:

- This endpoint is the backend authentication smoke test.
- It only returns the basic local profile.
- Role/capability data is returned by `GET /api/v1/ui/manifest`.
- If the user signed in to Firebase but has not completed TOTP MFA, the backend returns HTTP 428.

### Backend Login Endpoints

The backend intentionally does not provide these endpoints now:

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/2fa/*
```

Use Firebase Client SDK instead. Backend sessions are stateless and based only on the Firebase ID token sent with each request.

## 2.2 UI Manifest

### Get UI Manifest

```http
GET /api/v1/ui/manifest
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <firebase-id-token>
```

Successful response:

```json
{
  "routes": ["dashboard", "users"],
  "features": ["user.invite", "user.update_roles"],
  "widgets": ["dashboard.active_cases"]
}
```

Notes:

- The response is built from local roles and permissions.
- Permission rows are read from `permission`, `role_permission`, and `role`.
- This endpoint is for frontend rendering and route gating. Backend controllers must still enforce authorization.

## 2.3 Dashboard

### Get Dashboard

```http
GET /api/dashboard
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <firebase-id-token>
```

Request body: none.

Successful response:

```json
{
  "activeCases": [
    {
      "id": "case-001",
      "title": {
        "zh": "Emergency Housing Support",
        "en": "Emergency Housing Support"
      },
      "client": {
        "zh": "Monastic Sumedho",
        "en": "Monastic Sumedho"
      },
      "status": {
        "zh": "In Review",
        "en": "In Review"
      }
    }
  ],
  "attentionCases": [
    {
      "id": "attention-001",
      "client": {
        "zh": "Monastic Dhamma",
        "en": "Monastic Dhamma"
      },
      "reason": {
        "zh": "Awaiting volunteer assignment",
        "en": "Awaiting volunteer assignment"
      },
      "daysOpen": 5
    }
  ],
  "upcomingAppointments": [
    {
      "id": "appt-001",
      "startsAt": "2026-04-10T10:00:00+08:00",
      "client": {
        "zh": "Monastic Sumedho",
        "en": "Monastic Sumedho"
      },
      "purpose": {
        "zh": "Home Visit Assessment",
        "en": "Home Visit Assessment"
      }
    }
  ]
}
```

Notes:

- Backend currently returns hard-coded demo data.
- Frontend sorts `upcomingAppointments` by `startsAt` and keeps the first 5 items.

## 2.4 User Management

All endpoints in this section require local role `MANAGER`.

The backend maps local role names to Spring Security authorities as `ROLE_<NAME>`.

### List Users

```http
GET /api/v1/users
```

Protected endpoint. Requires `ROLE_MANAGER`.

Successful response:

```json
[
  {
    "id": 4,
    "username": "aranya_crm_admin",
    "email": "user@example.com",
    "fullName": "Example User",
    "status": "ACTIVE",
    "roles": ["MANAGER"]
  }
]
```

### Invite User

```http
POST /api/v1/users/invite
```

Protected endpoint. Requires `ROLE_MANAGER`.

Request body:

```json
{
  "username": "new_user",
  "fullName": "New User",
  "email": "new.user@example.com",
  "phone": "+65 0000 0000",
  "roles": ["VOLUNTEER"]
}
```

Successful response:

```json
{
  "id": 5,
  "username": "new_user",
  "email": "new.user@example.com",
  "fullName": "New User",
  "status": "ACTIVE",
  "roles": ["VOLUNTEER"]
}
```

Important limitation:

- This endpoint currently creates only the local database user.
- It does not create a Firebase Auth user.
- It does not set `firebase_uid`.
- The created user cannot pass Firebase-backed backend authentication until a Firebase Auth user exists and the local row is linked by UID.

### Update User Roles

```http
PATCH /api/v1/users/{id}/roles
```

Protected endpoint. Requires `ROLE_MANAGER`.

Request body:

```json
{
  "roles": ["MANAGER", "SOCIAL_WORKER"]
}
```

Successful response uses the same `UserSummaryDto` shape as list users.

### Update User Status

```http
PATCH /api/v1/users/{id}/status
```

Protected endpoint. Requires `ROLE_MANAGER`.

Request body:

```json
{
  "status": "ACTIVE"
}
```

Allowed status values:

- `ACTIVE`
- `INACTIVE`

Successful response uses the same `UserSummaryDto` shape as list users.

### Delete User

```http
DELETE /api/v1/users/{id}
```

Protected endpoint. Requires `ROLE_MANAGER`.

Successful response:

```http
204 No Content
```

Notes:

- This is a soft delete: the local user is marked `INACTIVE`.

## 3. Frontend-Designed APIs Not Yet Implemented By Backend

The frontend has service modules for the following endpoints. They currently work through mock or auto-fallback modes when the backend endpoint is unavailable.

Environment variable:

```text
VITE_DATA_MODE=mock | api | auto
```

Current default behavior is `auto`.

## 3.1 Clients

Frontend service file:

```text
frontend/src/services/client.api.ts
```

Planned endpoints:

```http
GET /api/v1/clients
GET /api/v1/clients/{id}
POST /api/v1/clients
PUT /api/v1/clients/{id}
```

Current frontend `Client` shape:

```ts
interface Client {
  id: string
  abbr: string
  nameEn: string
  nameChn: string
  nricNameEn: string
  nricNameChn: string
  nricNo: string
  sex: 'Male' | 'Female'
  dateOfBirth: string
  age: number
  maritalStatus: 'Never married' | 'Married' | 'Divorced' | 'Separated' | 'Widowed'
  nationality: string
  ethnicity: string
  dialectGroup: string
  contact: string
  nextOfKin: string
  preferredCommunication: 'WhatsApp Msg' | 'WhatsApp Audio' | 'Phone Call' | 'Home Visit'
  ableToUseWhatsApp: boolean
  preferredLanguage: string
  spokenLanguage: string
  address: string
  postalCode: string
  viharaType: string
  area: string
  membershipStatus: 'Active' | 'Inactive' | 'Discharged' | 'Withdrawn' | 'Deceased'
  dateJoined: string
  membershipRemarks: string
  buddhistTradition: 'Mahayana' | 'Theravada' | 'Vajrayana'
  ordinationStatus: 'Bhikkhu' | 'Bhikkhuni' | 'Samanera' | 'Sikkhamana' | 'Sayalay'
  dateTonsure: string
  countryTonsure: string
  placeTonsure: string
  dateOrdination: string
  countryOrdination: string
  placeOrdination: string
  ordinationYears: number
  ordinationCertificate: 'Completed' | 'Incomplete'
  dateVerification: string
  wellbeingIssues: Record<string, boolean>
  wellbeingRemarks: string
  specialNeeds: Record<string, boolean>
  specialNeedsRemarks: string
  bankTransfer: boolean
  payNow: boolean
  comments: string
}
```

## 3.2 Cases

Frontend service file:

```text
frontend/src/services/case.api.ts
```

Planned endpoints:

```http
GET /api/v1/cases
GET /api/v1/cases/{id}
POST /api/v1/cases
GET /api/v1/cases/{caseId}/notes
POST /api/v1/cases/{caseId}/notes
GET /api/v1/cases/{caseId}/status-history
```

Current frontend `Case` shape:

```ts
type CaseStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED'
type CaseColorCode = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'GREY' | 'BLACK'

interface Case {
  id: string
  caseNo: string
  dateOpened: string
  closedAt?: string
  clientId: string
  clientNameEn: string
  clientNameChn: string
  tradition: string
  socialWorker: string
  status: CaseStatus
  colorCode: CaseColorCode
  comments: string
  remarks: string
  services: Record<string, boolean>
}
```

## 3.3 Reports

Frontend service file:

```text
frontend/src/services/report.api.ts
```

Planned endpoints:

```http
GET /api/v1/reports
GET /api/v1/reports?submittedById={userId}
POST /api/v1/reports
```

Current frontend `EngagementReport` shape:

```ts
interface EngagementReport {
  id: string
  timestamp: string
  dateOfVisit: string
  timeOfVisit: string
  durationOfVisit: string
  staffName: string
  location: string
  programmeName: string
  clientId: string
  clientName: string
  typeOfVisit: string
  purposeOfVisit: string
  whatWasDone: string
  environmentObservations: string
  sanghaObservations: string
  otherObservations: string
  personalReflections: string
  recommendations: string
  mattersToHighlight: string
  submittedById: string
}
```

## 4. Role And Permission Direction

Current local role names include:

```text
MANAGER
SOCIAL_WORKER
VOLUNTEER
```

Authorization style:

```java
@PreAuthorize("hasRole('MANAGER')")
@PreAuthorize("hasAnyRole('MANAGER', 'SOCIAL_WORKER')")
```

Notes:

- Firebase proves identity and MFA completion.
- The local database controls CRM roles, permissions, and account status.
- `/api/v1/auth/me` intentionally does not expose roles.
- `/api/v1/ui/manifest` exposes UI capabilities derived from local roles.

## 5. OpenAPI UI

When the backend is running, Swagger UI should be available at:

```text
http://localhost:8080/swagger-ui/index.html
```

OpenAPI JSON should be available at:

```text
http://localhost:8080/v3/api-docs
```
