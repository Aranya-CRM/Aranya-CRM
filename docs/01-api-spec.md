# Aranya CRM API Specification

This document describes the API contract used by the current frontend and backend.

Current status:

- Backend implemented APIs: authentication, 2FA, dashboard
- Frontend-designed APIs not yet implemented by backend: clients, cases, reports
- Frontend Axios base URL defaults to `/api`
- Backend full route prefix is included in this document, for example `/api/v1/auth/login`

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

- frontend call: `http.post('/v1/auth/login')`
- backend route: `POST /api/v1/auth/login`

### Content Type

Requests and responses use JSON unless otherwise stated.

```http
Content-Type: application/json
```

### Authentication

Protected endpoints require a bearer access token:

```http
Authorization: Bearer <accessToken>
```

Public endpoints:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/2fa/verify`
- `GET /api/dashboard`
- OpenAPI / Swagger routes
- health and error routes

All other endpoints require authentication under the current backend security configuration.

### Error Shape

The JWT authentication filter returns this shape for unauthenticated requests:

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

Access-denied responses use:

```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

Note: the backend does not currently have a global exception handler for all validation and service errors, so non-auth error payloads may still use Spring Boot default error responses.

## 2. Implemented APIs

## 2.1 Authentication

### Login

```http
POST /api/v1/auth/login
```

Public endpoint.

Request body:

```json
{
  "email": "admin@test.com",
  "password": "password"
}
```

Validation:

- `email` is required and must be a valid email
- `password` is required and must be at least 8 characters

Successful response when 2FA is not required:

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "email": "admin@test.com",
  "fullName": "Admin User",
  "requiresTwoFactor": null,
  "tempToken": null
}
```

Successful response when 2FA is required:

```json
{
  "accessToken": null,
  "refreshToken": null,
  "tokenType": null,
  "expiresIn": 0,
  "email": null,
  "fullName": null,
  "requiresTwoFactor": true,
  "tempToken": "<short-lived-2fa-token>"
}
```

Notes:

- `expiresIn` is returned in seconds.
- Current login response does not include role information yet.
- Frontend login currently expects immediate access and refresh tokens; 2FA challenge UI still needs to be wired.

### Refresh Token

```http
POST /api/v1/auth/refresh
```

Public endpoint.

Request body:

```json
{
  "refreshToken": "<jwt-refresh-token>"
}
```

Validation:

- `refreshToken` is required

Successful response:

```json
{
  "accessToken": "<new-jwt-access-token>",
  "refreshToken": "<new-jwt-refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "email": "admin@test.com",
  "fullName": "Admin User",
  "requiresTwoFactor": null,
  "tempToken": null
}
```

Notes:

- Refresh tokens are persisted as hashes.
- Refresh token rotation is enabled: the used refresh token is revoked and replaced.
- If a revoked or expired refresh token is used, all refresh tokens for the user are revoked.

### Logout

```http
POST /api/v1/auth/logout
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <accessToken>
```

Request body: none.

Successful response:

```http
204 No Content
```

Notes:

- Logout revokes all refresh tokens for the authenticated user.
- The current access token remains valid until expiry unless token blacklisting is added later.

## 2.2 Two-Factor Authentication

2FA uses TOTP:

- algorithm: SHA1
- digits: 6
- period: 30 seconds
- allowed clock discrepancy: 1 time step

Backup codes:

- 8 codes are generated when 2FA is enabled
- backup codes are one-time use
- backup codes are stored as SHA-256 hashes

### Get 2FA Setup

```http
GET /api/v1/auth/2fa/setup
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <accessToken>
```

Successful response:

```json
{
  "secret": "BASE32TOTPSECRET",
  "qrCodeUri": "otpauth://totp/AranyaCRM%3Aadmin%40test.com?secret=BASE32TOTPSECRET&issuer=AranyaCRM&algorithm=SHA1&digits=6&period=30"
}
```

Notes:

- The returned secret is not persisted until `POST /api/v1/auth/2fa/enable` succeeds.
- The frontend can render `qrCodeUri` as a QR code for authenticator apps.

### Enable 2FA

```http
POST /api/v1/auth/2fa/enable
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "secret": "BASE32TOTPSECRET",
  "code": "123456"
}
```

Validation:

- `secret` is required
- `code` is required and must be exactly 6 characters

Successful response:

```json
{
  "codes": [
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
    "23456789",
    "A2C4E6G8",
    "H3J5L7N9",
    "P2R4T6V8",
    "W3X5Y7Z9"
  ]
}
```

Notes:

- The TOTP secret is encrypted before storage.
- A user who already has 2FA enabled must disable it before enabling again.
- Backup codes are only returned as plaintext at generation time.

### Verify 2FA Login Challenge

```http
POST /api/v1/auth/2fa/verify
```

Public endpoint.

Request body:

```json
{
  "tempToken": "<short-lived-2fa-token>",
  "code": "123456"
}
```

Validation:

- `tempToken` is required
- `code` is required

Successful response:

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "email": "admin@test.com",
  "fullName": "Admin User",
  "requiresTwoFactor": null,
  "tempToken": null
}
```

Notes:

- `code` can be either a 6-digit TOTP code or a backup code.
- TOTP codes are cached briefly after successful use to reduce replay within the accepted time window.
- Backup codes are marked as used after successful verification.

### Disable 2FA

```http
POST /api/v1/auth/2fa/disable
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "password": "password",
  "code": "123456"
}
```

Validation:

- `password` is required
- `code` is required

Successful response:

```http
204 No Content
```

Notes:

- The backend verifies both password and 2FA code.
- Disabling 2FA clears the encrypted TOTP secret and deletes backup codes.

### Regenerate Backup Codes

```http
POST /api/v1/auth/2fa/backup-codes
```

Protected endpoint.

Headers:

```http
Authorization: Bearer <accessToken>
```

Request body: none.

Successful response:

```json
{
  "codes": [
    "ABCDEFGH",
    "JKLMNPQR",
    "STUVWXYZ",
    "23456789",
    "A2C4E6G8",
    "H3J5L7N9",
    "P2R4T6V8",
    "W3X5Y7Z9"
  ]
}
```

Notes:

- Regeneration requires 2FA to already be enabled.
- Old backup codes are deleted and replaced.

## 2.3 Dashboard

### Get Dashboard

```http
GET /api/dashboard
```

Public endpoint under the current backend security configuration.

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

Response fields:

- `activeCases`: active case summary cards
- `attentionCases`: cases needing attention
- `upcomingAppointments`: upcoming appointment summary cards
- localized text fields use `{ "zh": "...", "en": "..." }`

Notes:

- Backend currently returns hard-coded demo data.
- Frontend sorts `upcomingAppointments` by `startsAt` and keeps the first 5 items.

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

Notes:

- `POST /api/v1/clients` currently expects `Omit<Client, 'id'>` on the frontend.
- `PUT /api/v1/clients/{id}` currently expects `Partial<Client>` on the frontend.
- Volunteer-facing views may use the reduced `ClientBasicInfo` shape.

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

Current frontend `CaseNote` shape:

```ts
interface CaseNote {
  id: string
  caseId: string
  date: string
  content: string
  followUp: string
  recordedBy: string
  createdAt: string
}
```

Current frontend `CaseStatusChange` shape:

```ts
interface CaseStatusChange {
  id: string
  caseId: string
  fromStatus: CaseStatus
  toStatus: CaseStatus
  changedBy: string
  changedAt: string
  reason: string
}
```

Notes:

- `POST /api/v1/cases` currently expects `Omit<Case, 'id'>` on the frontend.
- `POST /api/v1/cases/{caseId}/notes` currently expects `Omit<CaseNote, 'id' | 'createdAt'>`.

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

Notes:

- `POST /api/v1/reports` currently expects `Omit<EngagementReport, 'id' | 'timestamp'>` on the frontend.
- `submittedById` query filtering is a frontend service expectation and still needs backend support.

## 4. Role And Permission Direction

The backend already has `role` and `user_role` tables and maps role names to Spring Security authorities as `ROLE_<NAME>`.

Planned role names:

```text
ADMIN
SOCIAL_WORKER
VOLUNTEER
```

Current API gap:

- `LoginResponse` does not return roles yet.
- Endpoint-level or method-level role restrictions have not been applied beyond general authentication.

Recommended future response addition:

```json
{
  "roles": ["ADMIN"]
}
```

Recommended future authorization style:

```java
@PreAuthorize("hasRole('ADMIN')")
@PreAuthorize("hasAnyRole('ADMIN', 'SOCIAL_WORKER')")
```

## 5. OpenAPI UI

When the backend is running, Swagger UI should be available at:

```text
http://localhost:8080/swagger-ui/index.html
```

OpenAPI JSON should be available at:

```text
http://localhost:8080/v3/api-docs
```

