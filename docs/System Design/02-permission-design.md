# Aranya CRM — Permission Architecture Design

## 1. Core Philosophy: Data/Attribute-Driven Authorization

Traditional CRM permission systems hard-code role checks in business logic (e.g., `if role == 'SOCIAL_WORKER'`). This approach — **Identity-Driven Authorization** — creates tight coupling between code and org structure, making the system expensive to adapt when roles change.

Aranya CRM adopts **Data/Attribute-Driven Authorization**. After authentication, the backend resolves the user's identity into a flat `caps` dictionary:

```
caps: Record<CapKey, ScopeValue>
```

Business logic and UI components check `caps["clients:view"]` — never the role name. Role restructuring then requires only a DB configuration change, with zero frontend deploys and zero backend code changes.

### Three-Layer Enforcement

| Layer | Responsibility |
|---|---|
| **Frontend** | Reads `caps` from `/api/v2/ui/manifest`; renders UI in three states: SHOW / GREYED / HIDDEN |
| **Backend API** | Re-evaluates the same `caps` logic on every request at the interceptor/AOP layer |
| **DB Layer** | `role_cap` table is the single source of truth; updated via Liquibase migrations |

---

## 2. Role Definitions

Six CRM roles derived from the 2026 SST organisation structure:

| Role | Spreadsheet Equivalent | Nature of Access |
|---|---|---|
| `VIEW_MANAGER` | Board of Directors, Audit Committee, ED/Dy ED | Read-only governance & audit |
| `FULL_MANAGER` | General Manager | Full operational oversight |
| `TEAM_LEAD` | Lead Social Worker | Programme supervision |
| `SOCIAL_WORKER` | Social Worker, Care Coordinator | Day-to-day case operations |
| `VOLUNTEER` | Approved Volunteers | Field volunteer, limited |
| `ADMIN` | Admin Support, System Administrator | Membership admin & system ops |

> **Backward compatibility**: The legacy role `MANAGER` (from pre-v2 schema) maps to `FULL_MANAGER`. Both coexist in the DB during the transition period.

---

## 3. Scope Value Semantics

| Value | Meaning | UI Behaviour |
|---|---|---|
| `ALL` | Access all records regardless of ownership/team | Show fully |
| `OWN` | Access only records assigned to or created by self | Filter to own; hide others |
| `TEAM` | Access records belonging to same team | Filter to team |
| `YES` | Binary permission granted (no data scope needed) | Show / enable |
| `NO` | Denied — absence of a `role_cap` row | Hide / disabled |
| `WORKFLOW` | Action permitted only within workflow state machine | Show conditionally based on object state |

### Scope Translation from Source Document

| Source document value | Mapped scope |
|---|---|
| Full / Yes | `ALL` (if data-filterable) or `YES` (binary action) |
| Limited | `OWN` |
| Assigned cases only | `OWN` |
| Oversight / View | `YES` (supervisory read) |
| Recommend / Propose | `WORKFLOW` (chain initiator) |
| Approve | `WORKFLOW` (chain approver) |
| No / — | `NO` (row absent from `role_cap`) |
| Technical execution only | `YES` (admin technical access) |

---

## 4. Cap Key Registry

Cap keys follow the convention `{domain}:{action}` with `.` qualifiers for sub-actions.

### 4.1 ROUTE Domain (navigation visibility)

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `route:dashboard` | YES | YES | YES | YES | YES | YES |
| `route:clients` | YES | YES | YES | YES | — | YES |
| `route:cases` | YES | YES | YES | YES | YES | — |
| `route:reports` | YES | YES | YES | YES | YES | — |
| `route:users` | YES | YES | YES | — | — | — |
| `route:audit` | YES | YES | YES | — | — | — |

### 4.2 MEMBERS Domain (会员档案)

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `members:view` | YES | YES | ALL | OWN | — | ALL |
| `members:create` | — | YES | YES | — | — | ALL |
| `members:update` | — | YES | OWN | — | — | ALL |
| `members:docs.upload` | — | YES | OWN | — | — | ALL |
| `members:convert_to_client` | — | YES | WORKFLOW | WORKFLOW | — | — |
| `members:report.generate` | — | YES | WORKFLOW | — | — | — |

### 4.3 CLIENTS Domain (服务对象档案)

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `clients:view` | YES | ALL | ALL | ALL | OWN | OWN |
| `clients:create` | — | — | YES | YES | — | — |
| `clients:update` | — | ALL | ALL | ALL | — | — |
| `clients:delete` | — | WORKFLOW | WORKFLOW | — | — | — |
| `clients:docs.upload` | — | ALL | ALL | ALL | YES | — |
| `clients:convert_to_case` | — | YES | WORKFLOW | WORKFLOW | — | — |

### 4.4 CLIENTS — Sensitive Records

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `clients:sensitive.indicator` | YES | YES | ALL | ALL | — | — |
| `clients:sensitive.ordination` | YES | ALL | YES | — | — | — |
| `clients:sensitive.medical` | — | YES | ALL | OWN | — | — |
| `clients:sensitive.financial.view` | YES | ALL | ALL | ALL | — | — |
| `clients:sensitive.financial.approve` | — | WORKFLOW | WORKFLOW | WORKFLOW | — | — |
| `clients:sensitive.will_lpa` | — | YES | ALL | WORKFLOW | — | — |
| `clients:sensitive.acp` | — | YES | ALL | OWN | — | — |
| `clients:sensitive.living_will` | — | YES | ALL | OWN | — | — |
| `clients:sensitive.safeguarding` | — | YES | ALL | OWN | — | — |
| `clients:sensitive.docs.upload` | — | YES | ALL | YES | — | — |
| `clients:sensitive.export` | — | WORKFLOW | WORKFLOW | WORKFLOW | — | — |
| `clients:sensitive.archive` | — | WORKFLOW | WORKFLOW | — | — | YES |
| `clients:sensitive.delete` | — | — | — | — | — | YES |
| `clients:sensitive.audit` | YES | YES | — | — | — | — |

> `clients:sensitive.will_lpa` for SOCIAL_WORKER = `WORKFLOW`: requires explicit per-case approval (need-to-know basis per DOA).

### 4.5 CASES Domain

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `cases:view` | YES | ALL | ALL | OWN | OWN | — |
| `cases:notes.create` | — | ALL | ALL | YES | YES | — |
| `cases:notes.update.own` | — | ALL | YES | YES | YES | — |
| `cases:notes.update.others` | — | — | YES | — | — | — |
| `cases:notes.delete` | — | WORKFLOW | WORKFLOW | — | — | — |
| `cases:assign` | — | ALL | ALL | WORKFLOW | — | — |
| `cases:reassign` | — | ALL | ALL | WORKFLOW | — | — |
| `cases:status.close` | — | WORKFLOW | WORKFLOW | WORKFLOW | — | — |
| `cases:services.view` | YES | ALL | ALL | OWN | — | — |
| `cases:services.create` | — | ALL | ALL | YES | — | — |
| `cases:services.assess` | — | ALL | ALL | YES | — | — |
| `cases:services.recommend` | — | ALL | ALL | YES | — | — |
| `cases:services.approve` | — | WORKFLOW | WORKFLOW | — | — | — |
| `cases:services.assign_provider` | — | ALL | ALL | WORKFLOW | — | — |
| `cases:services.suspend` | — | WORKFLOW | WORKFLOW | WORKFLOW | — | — |
| `cases:services.close` | — | WORKFLOW | WORKFLOW | WORKFLOW | — | — |
| `cases:services.history` | YES | ALL | ALL | OWN | — | — |
| `cases:audit` | YES | YES | YES | — | — | — |

> **[?] Resolved**: `cases:view` for SOCIAL_WORKER = `OWN` — confirmed by "Assigned cases" in View Service Requests row of source document.

### 4.6 REPORTS Domain

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `reports:view` | YES | ALL | ALL | OWN | OWN | — |
| `reports:create` | — | YES | YES | YES | YES | — |
| `reports:update` | — | ALL | ALL | OWN | OWN | — |
| `reports:export` | — | ALL | ALL | OWN | — | — |
| `reports:delete` | — | WORKFLOW | WORKFLOW | — | — | — |
| `reports:approve_archive` | — | WORKFLOW | WORKFLOW | — | — | — |

> **[?] Resolved**: `reports:update` for SOCIAL_WORKER = `OWN` — SW edits only their own reports; full edit authority belongs to TEAM_LEAD and above.

### 4.7 ADMIN Domain

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `admin:users.manage` | — | WORKFLOW | WORKFLOW | — | — | YES |
| `admin:audit.view` | YES | YES | YES | — | — | — |
| `admin:data.bulk_export` | — | WORKFLOW | WORKFLOW | — | — | — |
| `admin:data.delete` | — | WORKFLOW | WORKFLOW | — | — | YES |

### 4.8 DASHBOARD Widgets

| Cap Key | VIEW_MGR | FULL_MGR | TEAM_LEAD | SOCIAL_WORKER | VOLUNTEER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard:total_clients` | YES | YES | YES | YES | — | — |
| `dashboard:active_cases` | YES | YES | YES | YES | — | — |
| `dashboard:urgent_cases` | — | YES | YES | YES | — | — |
| `dashboard:pending_reports` | — | YES | YES | YES | — | — |
| `dashboard:my_reports` | — | — | YES | YES | YES | YES |
| `dashboard:pending_tasks` | — | — | YES | YES | YES | YES |

---

## 5. DB Schema (Phase 1)

### New Tables

```sql
-- Canonical registry of all cap keys
CREATE TABLE cap_definition (
  id          BIGINT PRIMARY KEY AUTOINCREMENT,
  cap_key     VARCHAR(100) NOT NULL UNIQUE,
  domain      VARCHAR(50)  NOT NULL,
  description VARCHAR(255)
);

-- Role ↔ cap mapping with scope value
CREATE TABLE role_cap (
  id          BIGINT PRIMARY KEY AUTOINCREMENT,
  role_id     BIGINT       NOT NULL REFERENCES role(id),
  cap_def_id  BIGINT       NOT NULL REFERENCES cap_definition(id),
  scope_value VARCHAR(10)  NOT NULL,
  UNIQUE (role_id, cap_def_id)
);
```

### New Roles Added

| Role Name | Description |
|---|---|
| `VIEW_MANAGER` | Read-only governance & audit access |
| `FULL_MANAGER` | Full operational management (GM level) |
| `TEAM_LEAD` | Programme supervisor (Lead SW) |
| `ADMIN` | Membership admin & system operations |

> `MANAGER` (legacy) = equivalent to `FULL_MANAGER`. Both coexist until backend `@PreAuthorize` annotations are migrated in Phase 3.

---

## 6. API Contract

### v2 Manifest Endpoint

```
GET /api/v2/ui/manifest
Authorization: Bearer <firebase-id-token>
```

Response:
```json
{
  "caps": {
    "route:dashboard":                   "YES",
    "route:clients":                     "YES",
    "clients:view":                      "OWN",
    "clients:update":                    "ALL",
    "clients:sensitive.medical":         "OWN",
    "cases:view":                        "OWN",
    "cases:notes.create":                "YES",
    "reports:view":                      "OWN",
    "reports:update":                    "OWN",
    "dashboard:total_clients":           "YES"
  }
}
```

Keys absent from the response = `NO` (denied).

The v1 endpoint (`/api/v1/ui/manifest`) remains active for backward compatibility during the transition period.

---

## 7. Frontend Evaluation Engine

### Subject & Object Model

```ts
interface Subject {
  userId: string
  teamId?: string
  caps: Record<string, ScopeValue>        // from /v2/ui/manifest
}

interface DataObject {
  ownerId?: string                        // assigned caseworker user ID
  teamId?: string
  workflowState?: string                  // e.g. 'DRAFT', 'PENDING_APPROVAL'
}

type ScopeValue = 'ALL' | 'OWN' | 'TEAM' | 'YES' | 'NO' | 'WORKFLOW'
type Decision   = 'GRANT' | 'DENY'
```

### Resolution Logic

```
resolve(subject, capKey, object?) → GRANT | DENY

1. Look up scope = subject.caps[capKey]  (absent = NO → DENY)
2. ALL      → GRANT
3. YES      → GRANT
4. NO       → DENY
5. OWN      → subject.userId === object.ownerId ? GRANT : DENY
6. TEAM     → subject.teamId === object.teamId  ? GRANT : DENY
7. WORKFLOW → object.workflowState in allowedStates[capKey] ? GRANT : DENY
```

### UI Three-State Rendering

| Decision | UI Outcome |
|---|---|
| GRANT | Fully rendered, interactive |
| DENY (OWN/TEAM/WORKFLOW — user can see concept exists) | Rendered but greyed/disabled |
| DENY (NO — user has no awareness of feature) | Hidden entirely |

---

## 8. Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| **Phase 0** | Cap Key Registry definition; three `[?]` decisions resolved via source document | ✅ Done |
| **Phase 1** | DB: `cap_definition` + `role_cap` tables; new roles seeded; `/v2/ui/manifest` endpoint | ✅ Done (migrations 030–032) |
| **Phase 2** | Frontend: `useAccess()` extended; `EvaluationEngine.resolve()`; `/v2` API integration | Pending |
| **Phase 3** | Backend: `@PreAuthorize` replaced with cap-key interceptors; v1 manifest deprecated | Pending |
| **Phase 4** | Legacy `permission` + `role_permission` tables removed; `MANAGER` role retired | Pending |

---

## 9. Reference — Source Document

Based on **2026 SST CRM.xlsx** (Permission Matrix and DOA sheets), root of repository.
