# Aranya CRM API Specification

This document summarizes the API and backend service surface implemented in the current branch.

Last updated: 2026-05-21

## 1. Backend Summary

Backend stack:

- Spring Boot 3.4
- Spring Security, stateless Firebase ID token authentication
- Firebase Admin SDK token verification
- Spring Data JPA
- PostgreSQL
- Liquibase migrations
- springdoc OpenAPI / Swagger UI

Implemented backend services:

| Service | Responsibility | Status |
| --- | --- | --- |
| `UserService` | Current-user profile, local user listing, invite stub, role updates, status updates, soft delete, Firebase profile sync | Implemented |
| `UiManifestService` | Builds route/feature/widget capability lists from local role-permission records | Implemented |
| `DashboardService` | Builds role-aware dashboard sections from clients, cases, and visit reports | Implemented |
| `ClientService` | Lists clients, filters by search/status, returns client details and related contacts; creates and updates clients | Implemented |
| `CaseService` | Lists cases, filters by search/status, returns case details, and provides active/urgent case data for dashboard | Implemented, read-only |

Implemented HTTP API groups:

| Area | Endpoints |
| --- | --- |
| Auth profile | `GET /api/v1/auth/me` |
| UI manifest | `GET /api/v1/ui/manifest` |
| Dashboard | `GET /api/v1/dashboard` |
| Users (read-only list) | `GET /api/v1/users` |
| Admin — user management | `GET /api/admin/v1/users`, `POST /api/admin/v1/users/invite`, `PATCH /api/admin/v1/users/{id}/roles`, `PATCH /api/admin/v1/users/{id}/status`, `DELETE /api/admin/v1/users/{id}` |
| Clients | `GET /api/v1/clients`, `GET /api/v1/clients/{id}`, `POST /api/v1/clients`, `PATCH /api/v1/clients/{id}` |
| Cases | `GET /api/v1/cases`, `GET /api/v1/cases/{id}` |
| Case documents | `GET/POST /api/v1/cases/{id}/documents`, `GET /api/v1/cases/{id}/documents/{documentId}/download-url`, `DELETE /api/v1/cases/{id}/documents/{documentId}` |
| Drive migration | `GET /api/v1/admin/drive/files`, `POST /api/v1/admin/drive/import` |

Not implemented as backend HTTP APIs yet:

- `POST /api/v1/cases`
- `GET /api/v1/cases/{caseId}/notes`
- `POST /api/v1/cases/{caseId}/notes`
- `GET /api/v1/cases/{caseId}/status-history`
- `/api/v1/reports/**`
- Backend email/password login, refresh-token, logout, registration, or custom 2FA endpoints

## 2. Base URLs

Local backend:

```text
http://localhost:8080
```

Docker frontend reverse proxy:

```text
/api -> http://backend:8080
```

Default frontend API base URL:

```text
VITE_API_BASE_URL=/api
```

## 3. Authentication And Authorization

Protected endpoints require a Firebase ID token:

```http
Authorization: Bearer <firebase-id-token>
```

The backend accepts the request only when all conditions pass:

- The token is valid according to Firebase Admin SDK.
- Firebase token claim `firebase.sign_in_second_factor` is `totp`.
- Firebase email is verified.
- A local `users.firebase_uid` row exists for the Firebase UID.
- The local user status is `ACTIVE`.

Failure responses from the Firebase filter:

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `INVALID_TOKEN` | Firebase token is invalid or expired |
| `401` | `EMAIL_NOT_VERIFIED` | Firebase email is not verified |
| `428` | `MFA_NOT_ENROLLED` | TOTP MFA was not completed |
| `403` | `USER_NOT_REGISTERED` | Firebase UID is not linked to a local user |
| `403` | `USER_DISABLED` | Local user status is not `ACTIVE` |

Public endpoints:

- `GET /api/health`
- `/api/public/**`
- `/actuator/health`
- `/v3/api-docs/**`
- `/swagger-ui/**`
- `/swagger-ui.html`
- `/error`

All other endpoints require authentication unless method-level authorization is stricter.

Local role names are converted to Spring Security authorities as:

```text
ROLE_<ROLE_NAME>
```

Current seeded business roles:

- `MANAGER`
- `SOCIAL_WORKER`
- `VOLUNTEER`

## 4. Error Shape

Firebase filter errors use:

```json
{
  "code": "MFA_NOT_ENROLLED",
  "message": "TOTP MFA enrollment is required to access this resource",
  "path": "/api/v1/auth/me",
  "timestamp": "2026-05-15T12:00:00+08:00"
}
```

Security entry-point responses for missing auth and method authorization are JSON responses with the relevant HTTP status, but the current implementation does not write a response body there.

## 5. Auth API

### GET `/api/v1/auth/me`

Returns the current authenticated local user profile.

Authorization:

- Authenticated Firebase user
- No role requirement

Response:

```json
{
  "id": 4,
  "email": "aranya.crm.admin@gmail.com",
  "fullName": "Aranya CRM"
}
```

Notes:

- This endpoint intentionally does not expose roles or capabilities.
- Role/capability data is returned by `GET /api/v1/ui/manifest`.
- `UserService.syncFromFirebase` may update `emailVerified` and `fullName` from the Firebase token during authentication.
- `preferredLanguage` (`zh` | `en` | `null`) carries the user's saved UI language preference; `null` means the frontend falls back to browser/default.

### PATCH `/api/v1/auth/me/language`

Persists the current user's UI language preference (follows the account across devices/browsers).

Authorization:

- Authenticated Firebase user
- No role requirement

Request:

```json
{ "language": "en" }
```

- `language` is required and must be `zh` or `en` (case-insensitive); any other value returns `400`.

Response: the updated `MeResponse` (same shape as `GET /api/v1/auth/me`, with the new `preferredLanguage`).

## 6. UI Manifest API

### GET `/api/v1/ui/manifest`

Returns current-user capabilities for frontend route gating and conditional UI actions.

Authorization:

- Authenticated Firebase user

Response:

```json
{
  "routes": [
    "dashboard",
    "clients.list",
    "users.list"
  ],
  "features": [
    "users.invite",
    "users.assignRoles"
  ],
  "widgets": [
    "dashboard.stats"
  ]
}
```

Contract:

- The backend returns only capability ids.
- The frontend owns labels, layout, component choices, route definitions, field names, table columns, colors, and localized copy.
- The UI manifest is not a security boundary. Business APIs must still enforce authorization.

Backend source:

- `UiManifestService`
- `permission`
- `role_permission`
- `role`

## 7. Dashboard API

### GET `/api/v1/dashboard`

Returns role-aware dashboard data sections.

Authorization:

- Authenticated Firebase user

Response shape:

```json
{
  "designSystem": {
    "name": "aranya-crm-dashboard",
    "version": "1.0"
  },
  "screen": {
    "id": "dashboard",
    "version": "2026-05-13"
  },
  "sections": [
    {
      "id": "sw.stats",
      "stats": [
        { "id": "activeMonastics", "value": "12" },
        { "id": "openCases", "value": "4" },
        { "id": "urgentCases", "value": "1" },
        { "id": "pendingReports", "value": "0" }
      ]
    }
  ],
  "metadata": {
    "generatedAt": "2026-05-15T12:00:00+08:00"
  }
}
```

Section ids currently returned:

| Role | Section ids |
| --- | --- |
| `VOLUNTEER` | `volunteer.report_stats`, `volunteer.my_recent_reports`, `volunteer.quick_actions` |
| `SOCIAL_WORKER` | `sw.stats`, `sw.recent_cases`, `sw.recent_reports`, `sw.quick_actions` |
| `MANAGER` | `sw.stats`, `sw.recent_cases`, `sw.recent_reports`, `sw.quick_actions` |

Stat ids:

- `myReportCount`
- `activeMonastics`
- `openCases`
- `urgentCases`
- `pendingReports`

Action ids:

- `submit_report`
- `new_case`
- `add_client`

Item fields may include:

```json
{
  "id": "1",
  "clientId": "10",
  "clientNameChn": "Chinese name",
  "clientNameEn": "English name",
  "caseCode": "CASE-2026-001",
  "statusCode": "OPEN",
  "colorCode": "RED",
  "openedAt": "2026-01-20T09:30",
  "reportType": "HOME_VISIT",
  "dateOfVisit": "2026-01-20",
  "createdAt": "2026-01-20T09:30",
  "createdById": "3",
  "createdByName": "Social Worker User"
}
```

Notes:

- Dashboard returns data ids and values only. It does not return frontend-owned labels or layout instructions.
- `pendingReports` is currently returned as `"0"` because report review workflow fields are not implemented.

## 8. User List API (read-only)

Account management **write** operations have moved to the Admin Dashboard API (section 8a, `/api/admin/v1/users`). This section keeps only the read-only list used by non-admin features (case service-event assignee picker, approval assignee options).

### GET `/api/v1/users`

Lists local users with their local roles. Used as the "assignable users" source.

Authorization:

- Authenticated Firebase user
- `admin:users.manage` **or** `cases:services.create` (so caseworkers can populate assignee dropdowns)

Response:

```json
[
  {
    "id": 4,
    "username": "aranya_crm_admin",
    "email": "aranya.crm.admin@gmail.com",
    "fullName": "Aranya CRM",
    "status": "ACTIVE",
    "roles": ["MANAGER"]
  }
]
```

## 8a. Admin Dashboard — User Management API

Base path `/api/admin/v1/users`. All endpoints require the `admin:users.manage` capability. Logic is delegated to `UserService` (same behavior as the previous `/api/v1/users` write endpoints); only the namespace changed.

### GET `/api/admin/v1/users`

Lists all local users for the admin console (same shape as `GET /api/v1/users`).

### POST `/api/admin/v1/users/invite`

Creates a Firebase Auth account (email marked verified, no password) plus a local user with status `INVITED` and the assigned role; rolls back the Firebase account if local persistence fails. The frontend then triggers Firebase's built-in "set password" email. On first full login (password set + TOTP) the auth filter flips the user to `ACTIVE`.

Request:

```json
{
  "username": "new_user",
  "fullName": "New User",
  "email": "new.user@example.com",
  "phone": "12345678",
  "roles": ["VOLUNTEER"]
}
```

Validation:

- `username`: optional, max 50 (derived from email if blank)
- `fullName`: optional, max 100 (derived from email local part if blank)
- `email`: required, valid email, max 100
- `phone`: optional, max 20
- `roles`: required, exactly one role

Response: `UserSummaryDto` for the created user (`status: "INVITED"`).

### PATCH `/api/admin/v1/users/{id}/roles`

Replaces the user's local role. Request `{ "roles": ["MANAGER"] }` (exactly one role, must exist in the `role` table). Returns the updated `UserSummaryDto`.

### PATCH `/api/admin/v1/users/{id}/status`

Updates local user status. Request `{ "status": "INACTIVE" }` (`ACTIVE` or `INACTIVE`). Managers cannot deactivate their own account (`400`). Returns the updated `UserSummaryDto`.

### DELETE `/api/admin/v1/users/{id}`

Soft-deletes a user by setting local status to `DELETED`. Managers cannot remove their own account (`400`).

```http
204 No Content
```

## 9. Client API

Authorization:

| Endpoint | Required role |
| --- | --- |
| `GET /api/v1/clients` | Authenticated user |
| `GET /api/v1/clients/{id}` | Authenticated user |
| `POST /api/v1/clients` | `ROLE_MANAGER` |
| `PATCH /api/v1/clients/{id}` | `ROLE_MANAGER` |

### GET `/api/v1/clients`

Lists clients.

Query parameters:

| Name | Required | Meaning |
| --- | --- | --- |
| `q` | No | Search query. Trimmed before use. |
| `membershipStatus` | No | Membership status filter. Trimmed before use, compared case-insensitively in repository methods. |

Response:

```json
[
  {
    "id": 1,
    "abbr": "ABC",
    "nameEn": "Client English Name",
    "nameChn": "Client Chinese Name",
    "contact": "91234567",
    "preferredCommunication": "WHATSAPP",
    "preferredLanguage": "EN",
    "area": "Central",
    "buddhistTradition": "Theravada",
    "ordinationStatus": "Ordained",
    "membershipStatus": "ACTIVE"
  }
]
```

### GET `/api/v1/clients/{id}`

Returns client details and related contacts.

Response:

```json
{
  "id": 1,
  "abbr": "ABC",
  "nameEn": "Client English Name",
  "nameChn": "Client Chinese Name",
  "contact": "91234567",
  "preferredCommunication": "WHATSAPP",
  "whatsappEnabled": true,
  "preferredLanguage": "EN",
  "spokenLanguage": "English",
  "addressText": "Address",
  "postalCode": "123456",
  "areaDistrict": "Central",
  "viharaType": "Temple",
  "nricNameEn": "Client English Name",
  "nricNameChn": "Client Chinese Name",
  "nricNo": "S1234567A",
  "ordinationCertificateStatus": "Complete",
  "dateOfVerification": "2026-01-01",
  "gender": "FEMALE",
  "dateOfBirth": "1980-01-01",
  "maritalStatus": "SINGLE",
  "nationality": "Singaporean",
  "ethnicity": "Chinese",
  "dialectGroup": "Hokkien",
  "membershipStatus": "ACTIVE",
  "dateJoined": "2026-01-01",
  "membershipRemarks": "Remarks",
  "buddhistTradition": "Theravada",
  "ordinationStatus": "Ordained",
  "dateOfTonsure": "2000-01-01",
  "countryOfTonsure": "Singapore",
  "placeOfTonsure": "Temple",
  "dateOfOrdination": "2003-01-01",
  "countryOfOrdination": "Singapore",
  "placeOfOrdination": "Temple",
  "wellbeingLivingConditions": true,
  "wellbeingMentalHealth": false,
  "wellbeingPhysicalHealth": false,
  "wellbeingFinancialStability": true,
  "wellbeingSocialSupport": true,
  "wellbeingLegalIssues": false,
  "wellbeingSpiritual": true,
  "wellbeingRemarks": "Wellbeing remarks",
  "specialNeeds": "None",
  "specialNeedsRemarks": "Special needs remarks",
  "bankTransferInfo": "Bank transfer details",
  "payNowInfo": "PayNow details",
  "nextOfKinContact": "91230000",
  "comments": "Comments",
  "createdAt": "2026-01-01T09:00:00",
  "relatedContacts": [
    {
      "id": 1,
      "name": "Related Contact",
      "relationshipType": "NEXT_OF_KIN",
      "phone": "91230000",
      "email": "contact@example.com",
      "addressText": "Address",
      "primary": true,
      "notes": "Notes"
    }
  ]
}
```

Notes:

- Related contacts are ordered by primary contact first, then creation time ascending.
- Missing client ids result in an `EntityNotFoundException`; global error mapping should be confirmed before relying on a final HTTP shape.
- The frontend currently treats all client membership status values as `Active` and does not expose membership-status filtering in the client profile page.

### POST `/api/v1/clients`

Creates a new client and atomically creates an initial `ClientCase` in the same transaction.

Authorization: `ROLE_MANAGER`

Request:

```json
{
  "nameEn": "Venerable Hui Ming",
  "nameChn": "慧明法师",
  "abbr": "HM",
  "buddhistTradition": "Theravada",
  "ordinationStatus": "Ordained",
  "areaDistrict": "Central",
  "preferredLanguage": "EN",
  "contact": "91234567",
  "colorCode": "GREEN"
}
```

Validation:

| Field | Required | Constraints |
| --- | --- | --- |
| `nameEn` | Yes | Max 150 |
| `abbr` | Yes | Max 20 |
| `nameChn` | No | Max 100 |
| `buddhistTradition` | No | Max 50 |
| `ordinationStatus` | No | Max 30 |
| `areaDistrict` | No | Max 100 |
| `preferredLanguage` | No | Max 50 |
| `contact` | No | Max 20 |
| `colorCode` | No | Max 20; used as the initial case color — `GREEN`, `YELLOW`, `ORANGE`, `RED` |

Response: `201 Created` with `Location: /api/v1/clients/{id}` header; body is the full `ClientDetailResponse`.

Notes:

- The initial case title is set to `{nameEn} - Initial Case`.
- `caseCode` is auto-generated in format `ASDFL/{YEAR}/C/{NNN}` (3-digit zero-padded, e.g. `ASDFL/2026/C/001`). The sequence resets at the start of each calendar year.
- The authenticated manager is recorded as `createdBy` on the initial case.

### PATCH `/api/v1/clients/{id}`

Partially updates an existing client profile.

Authorization: `ROLE_MANAGER`

All fields are optional. Only non-null fields in the request body are applied — absent and explicit `null` fields leave the existing value unchanged.

Request fields mirror the full `ClientDetailResponse` profile (all `String`, `Boolean`, and `LocalDate` fields on the `Client` entity are patchable). Key fields include:

```json
{
  "nameEn": "Updated Name",
  "nameChn": "更新名字",
  "abbr": "UN",
  "contact": "91234567",
  "preferredCommunication": "WHATSAPP",
  "whatsappEnabled": true,
  "preferredLanguage": "EN",
  "spokenLanguage": "English",
  "addressText": "123 Example Street",
  "postalCode": "123456",
  "areaDistrict": "Central",
  "gender": "FEMALE",
  "dateOfBirth": "1980-01-01",
  "buddhistTradition": "Theravada",
  "ordinationStatus": "Ordained",
  "wellbeingPhysicalHealth": true,
  "membershipRemarks": "Remarks"
}
```

Response: `200 OK` with the full updated `ClientDetailResponse`.

Notes:

- Uses `@DynamicUpdate` on the entity; only changed columns are written to the database.
- Missing client id results in an `EntityNotFoundException`.

## 10. Case API

The current backend implements read-only case APIs.

Authorization:

- Authenticated Firebase user

Current access behavior:

- `GET /api/v1/cases` returns all cases visible to any authenticated user.
- Manager-only all-case visibility and social-worker assignment filtering are not enforced yet.
- Future authorization should allow `MANAGER` to see all cases and restrict `SOCIAL_WORKER` to assigned or otherwise authorized cases.

### GET `/api/v1/cases`

Lists cases.

Query parameters:

| Name | Required | Meaning |
| --- | --- | --- |
| `q` | No | Search query. Matches case code, title, client English name, or client Chinese name. |
| `status` | No | Case status filter. Compared case-insensitively. |

Response:

```json
[
  {
    "id": 1,
    "caseCode": "CASE-2026-001",
    "title": "Medical transport follow-up",
    "description": "Arrange transport for a specialist appointment and confirm volunteer availability.",
    "priority": "HIGH",
    "status": "OPEN",
    "colorCode": "RED",
    "tradition": "Mahayana",
    "openedAt": "2026-01-20T09:30:00",
    "closedAt": null,
    "clientId": 1,
    "clientNameEn": "Venerable Hui Ming",
    "clientNameChn": "",
    "createdById": 3,
    "createdByName": "Social Worker",
    "comments": "Urgent health-related case for dashboard and priority filters.",
    "remarks": "Call clinic two days before appointment."
  }
]
```

### GET `/api/v1/cases/{id}`

Returns one case by database id.

Response shape is the same as one item from `GET /api/v1/cases`, plus the following detail-only fields:

| Field | Type | Notes |
|-------|------|-------|
| `clientAbbr` | string | Monastic abbreviation |
| `clientGender` | string | From `client.gender` |
| `clientOrdinationStatus` | string | From `client.ordination_status` |
| `services` | object | Map of service key → boolean |
| `serviceEvents` | array | See `ServiceEventResponse` |

Notes:

- Missing case ids result in an `EntityNotFoundException`; global error mapping should be confirmed before relying on a final HTTP shape.
- Case notes and status history remain frontend fallback/mock behavior until their backend APIs are implemented.
- `clientGender` / `clientOrdinationStatus` are read by the volunteer task detail page. They are visible to any role that can read a case.

### GET `/api/v1/cases/{id}/calendar-events`

Reads events from the shared Google Calendar within a time window, for overlay on the case calendar. The case's own events are excluded (they are rendered from the local source of truth `service_appointment`).

Query params (both required, ISO-8601 local date-time):

| Param | Example |
|-------|---------|
| `from` | `2026-06-01T00:00:00` |
| `to`   | `2026-07-06T00:00:00` |

Response: array of

```json
{
  "id": "string",            // Google event id
  "title": "string|null",
  "start": "ISO-8601|null",
  "end": "ISO-8601|null",
  "allDay": false,
  "source": "OTHER_CASE | EXTERNAL",
  "caseId": 123,             // present when the event was written by another case
  "colorId": "string|null"   // Google event palette id "1"-"11"; null when the event has no per-event colour
}
```

Notes:

- Backed by a Service Account / OAuth single account; controlled by `google.calendar.*` config. When `google.calendar.enabled=false` (or credentials/calendar-id missing) it returns an empty array — the integration degrades safely and never blocks the request.
- `colorId` is only set for events whose colour was changed manually in Google Calendar. When null, the frontend falls back to its own source-based colours. The id → colour mapping lives in `frontend/src/features/cases/googleEventColors.ts` (sourced from `GET /calendar/v3/colors`, `event` palette).
- Case service events created via `POST /api/v1/cases/{id}/service-events` are mirrored (best-effort) to the chosen shared calendar and tagged with the case id via extended properties; deletion removes the mirrored event.

### Service event write endpoints

| Method & Path | Cap | Purpose |
|---------------|-----|---------|
| `POST /api/v1/cases/{id}/service-events` | `cases:services.create` | Create event (local truth source + best-effort Google mirror). |
| `PATCH /api/v1/cases/{id}/service-events/{eventId}` | `cases:services.create` | Edit event; recomposes title/body and updates the Google mirror (moves it if the target calendar changed). |
| `POST /api/v1/cases/{id}/service-events/{eventId}/sync` | `cases:services.create` | Manually retry mirroring to Google when a previous push failed. |
| `DELETE /api/v1/cases/{id}/service-events/{eventId}` | `cases:services.create` | Delete event; removes the Google mirror (404/410 treated as already gone). |

- POST/PATCH bodies use `CreateServiceEventRequest`. `scheduledEnd`, when provided, must not be before `scheduledStart` (otherwise `400`).
- `ServiceEventResponse` includes `synced` (true when a `google_event_id` exists) and `googleCalendarId` (the calendar the mirror currently lives on). The frontend shows a "not synced" badge + retry when integration is enabled but `synced=false`.

`CreateServiceEventRequest` fields:

| Field | Type | Notes |
|-------|------|-------|
| `serviceKey` | string | Required. Must be one of the case's selected services. |
| `scheduledStart` | ISO-8601 local date-time | Required. |
| `scheduledEnd` | ISO-8601 local date-time | Optional; must not be before `scheduledStart`. |
| `assignedUserId` | number | Optional. The assignee sees the event on their task list. |
| `calendarId` | string | Optional; defaults to the configured default calendar. |
| `location` | string | Short venue name; goes into the title as `@X`. |
| `address` | string | Full multi-line address; rendered as `*Address*` in the Google event body. Shown to the assigned volunteer on the task detail page. |
| `agenda` | string | `*Agenda*` |
| `schedule` | string | `*Schedule*` |
| `manpower` | string | `*Manpower*` |
| `instructions` | string | `*Instructions for Kappiya*` |
| `workDescription` | string | Free text: what needs doing. |
| `notes` | string | Free text: contact info etc. |
| `reportDueAt` | ISO-8601 local date-time | Optional report deadline. |

- `address` is distinct from `location`: `location` is the short label used in the event title, `address` is the full address a volunteer needs in order to get there. Events created before this field was wired up have `address = null` and render as `-`.

### Case document endpoints

| Method & Path | Cap | Purpose |
|---------------|-----|---------|
| `GET /api/v1/cases/{id}/documents` | `cases:view` | List active case files grouped by fixed category on the frontend. |
| `POST /api/v1/cases/{id}/documents` | `cases:view` + `cases:documents.upload` | Multipart upload with `category`, `file`, and optional `displayName`; metadata is stored in the database and file bytes in GCS. |
| `GET /api/v1/cases/{id}/documents/{documentId}/download-url` | `cases:view` | Return a short-lived signed GCS URL. Query `disposition=attachment` forces browser download; `disposition=inline` supports preview. |
| `DELETE /api/v1/cases/{id}/documents/{documentId}` | `cases:view` + `cases:documents.delete` | Permanently delete the GCS object, case-document link, and document metadata. |

- Categories are exactly `ORDINATION`, `MEDICAL`, `FINANCIAL`, and `LEGAL`.
- GCS object keys are business-readable: `cases/{safeCaseCode}/{categoryFolder}/{timestamp}-{documentId}-{safeFileName}`.
  For example, case code `ASDFL/2026/C/006` is stored under `cases/ASDFL-2026-C-006/Medical Records/...`.
  Category folders use the full English labels: `Ordination Certificate`, `Medical Records`,
  `Financial Records`, and `Legal Documents`.
- No sensitive-file visibility split in this phase. `document` carries a `source` (`UPLOAD` / `DRIVE_IMPORT`) and, for imports, a `drive_file_id`.

### Drive migration endpoints

One-time migration console for importing historical files from the organization Google Drive into GCS-backed case documents. Reads Drive as the shared `infotech` account (its OAuth refresh token must include `drive.readonly`).

| Method & Path | Cap | Purpose |
|---------------|-----|---------|
| `GET /api/v1/admin/drive/files?folderId={id}` | `cases:documents.import` | List folders/files under a Drive folder (omit `folderId` for the configured root). Google-native docs report an `exportAs` hint (e.g. `PDF`). |
| `POST /api/v1/admin/drive/import` | `cases:documents.import` | Batch import: body `{ items: [{ driveFileId, caseId, category, displayName? }] }`. Returns a per-item result (`IMPORTED` / `SKIPPED` / `FAILED`). |

- `cases:documents.import` is granted to managers only.
- Controlled by `google.drive.*` config; when disabled or credentials are missing, both endpoints return `503 DRIVE_IMPORT_UNAVAILABLE` (safe degrade).
- Idempotent: a `(caseId, driveFileId)` already imported is `SKIPPED`. Each item imports in its own transaction, so one failure does not block the rest.
- Google-native documents are exported before storage (Docs→PDF, Sheets→XLSX, Slides→PDF, Drawings→PNG, others→PDF).

### Approval expiry

`CASE_CREATE` approvals (convert/create case) carry an `expires_at` of `created_at + 30 days`. Overdue pending requests are auto-set to status `EXPIRED` by a daily scheduled sweep (and defensively at decision time), so a create-case approval always reaches a result within 30 days. Other approval types have no time limit.

## 11. APIs Not Yet Implemented

The frontend contains service modules for clients, cases, reports, and auth support. The backend currently does not expose the following planned endpoints:

```http
POST /api/v1/cases
GET /api/v1/cases/{caseId}/notes
POST /api/v1/cases/{caseId}/notes
GET /api/v1/cases/{caseId}/status-history

GET /api/v1/reports
GET /api/v1/reports?submittedById={userId}
POST /api/v1/reports
```

The current backend also intentionally does not expose:

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/2fa/*
```

Firebase Authentication and MFA enrollment/challenge are handled by the frontend through Firebase.

## 12. Observability

### Spring Boot Admin

Runtime monitoring UI for the backend JVM, health indicators, log levels, and HTTP traces.

| URL | Service |
| --- | --- |
| `http://localhost:9090` | Spring Boot Admin (Docker or local admin-server) |

The backend registers itself with the admin server at startup using `SPRING_BOOT_ADMIN_URL`. All actuator endpoints are exposed (`management.endpoints.web.exposure.include: "*"`).

### SonarQube (Docker profile)

Code quality and coverage reporting. Activated via `--profile sonar`:

```powershell
docker compose -f infra/docker/docker-compose.yaml --profile sonar up -d sonar-postgres sonarqube
```

Then run the scanner:

```powershell
docker compose -f infra/docker/docker-compose.yaml --profile sonar run --rm sonar-scanner
```

| URL | Service |
| --- | --- |
| `http://localhost:9000` | SonarQube UI |

Requires `SONAR_TOKEN` to be set before running the scanner (generate via SonarQube UI → My Account → Security → Tokens).

Coverage data is produced by JaCoCo (`prepare-agent` + `report` on the `verify` phase) and read by the `sonar-maven-plugin`.

## 13. OpenAPI UI

When the backend is running, Swagger UI should be available at:

```text
http://localhost:8080/swagger-ui/index.html
```

OpenAPI JSON should be available at:

```text
http://localhost:8080/v3/api-docs
```
