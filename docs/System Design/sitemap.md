# Aranya CRM Capability Sitemap

## Boundary

The frontend owns components, layout, labels, table columns, icons, and interaction design.

The backend owns authentication, authorization decisions, route access, action access, and dynamic business data.

The backend must not send component definitions, static labels, layout instructions, table columns, field labels, colors, or role names to the frontend. It only sends capability ids and dynamic data.

## Capability Endpoint

```http
GET /api/v1/ui/manifest
Authorization: Bearer <accessToken>
```

Response:

```json
{
  "routes": [
    "dashboard",
    "reports.list",
    "reports.create"
  ],
  "features": [
    "dashboard.view",
    "reports.create",
    "reports.view.own"
  ],
  "widgets": [
    "dashboard.myReports",
    "dashboard.pendingTasks"
  ]
}
```

The response must not contain:

- role names
- user role arrays
- navigation labels
- component props
- table columns
- form field labels
- layout metadata

## Frontend Usage

The frontend keeps fixed local registries:

- route id to route path/component
- sidebar item definitions
- dashboard widget definitions
- table column definitions
- page layouts
- button labels and icons

The frontend only checks capability ids:

```ts
canRoute('reports.list')
canFeature('reports.create')
canWidget('dashboard.myReports')
```

Example local sidebar registry:

```ts
const NAV_ITEMS = [
  { routeId: 'dashboard', path: '/dashboard', labelZh: '工作台', labelEn: 'Dashboard' },
  { routeId: 'clients.list', path: '/clients', labelZh: '僧人档案', labelEn: 'Clients' },
  { routeId: 'cases.list', path: '/cases', labelZh: '个案管理', labelEn: 'Cases' },
  { routeId: 'reports.list', path: '/reports', labelZh: '探访报告', labelEn: 'Reports' },
  { routeId: 'users.list', path: '/users', labelZh: '用户管理', labelEn: 'Users' }
]
```

If `canRoute(item.routeId)` is false, the frontend hides that sidebar item and blocks direct route access.

## Route Capabilities

| id             | frontend path     |
| -------------- | ----------------- |
| dashboard      | /dashboard        |
| clients.list   | /clients          |
| clients.create | /clients/new      |
| clients.detail | /clients/:id      |
| clients.edit   | /clients/:id/edit |
| cases.list     | /cases            |
| cases.create   | /cases/new        |
| cases.detail   | /cases/:id        |
| reports.list   | /reports          |
| reports.create | /reports/new      |
| users.list     | /users            |

## Feature Capabilities

### Dashboard

| id             | meaning              |
| -------------- | -------------------- |
| dashboard.view | May access dashboard |

### Client Profiles

| id                    | meaning                            |
| --------------------- | ---------------------------------- |
| clients.search        | May search client profiles         |
| clients.view.basic    | May view restricted client profile |
| clients.view.full     | May view full client profile       |
| clients.create        | May create client profile          |
| clients.update        | May edit client profile            |
| clients.delete        | May delete client profile          |
| clients.contacts.link | May link related contacts          |

### Cases

| id                         | meaning                   |
| -------------------------- | ------------------------- |
| cases.view                 | May view cases            |
| cases.notes.create         | May add notes to cases    |
| cases.create               | May create cases          |
| cases.status.update        | May update case status    |
| cases.assignVolunteer      | May assign volunteers     |
| cases.close                | May close cases           |
| cases.documents.uploadEdit | May upload/edit documents |
| cases.documents.delete     | May delete documents      |
| cases.audit                | May audit case records    |

### Reports

| id                     | meaning                     |
| ---------------------- | --------------------------- |
| reports.create         | May create reports          |
| reports.view.own       | May view own reports        |
| reports.view.all       | May view all reports        |
| reports.update.own     | May edit own reports        |
| reports.update.any     | May edit any report         |
| reports.delete         | May delete reports          |
| reports.approveArchive | May approve/archive reports |

### Users

| id                       | meaning                          |
| ------------------------ | -------------------------------- |
| users.invite             | May invite users                 |
| users.assignRoles        | May assign access groups         |
| users.stats.view         | May view user stats              |
| users.create             | May create users                 |
| users.update             | May update users                 |
| users.activateDeactivate | May activate or deactivate users |
| users.delete             | May delete users                 |

### Alerts

| id                   | meaning                   |
| -------------------- | ------------------------- |
| alerts.receiveUrgent | May receive urgent alerts |

## Dashboard Widget Capabilities

| id                             | meaning                                  |
| ------------------------------ | ---------------------------------------- |
| dashboard.myReports            | Show current user's report widget        |
| dashboard.pendingTasks         | Show current user's pending tasks widget |
| dashboard.recentReports        | Show recent reports widget               |
| dashboard.totalClients         | Show total clients stat                  |
| dashboard.activeCases          | Show active cases stat                   |
| dashboard.pendingReports       | Show pending reports stat                |
| dashboard.urgentCases          | Show urgent cases stat                   |
| dashboard.upcomingAppointments | Show upcoming appointments widget        |

## Current Role-to-Capability Mapping

Role names are backend/database details. They are listed here only for system design and seeding.

### Volunteer

Routes:

- dashboard
- reports.list
- reports.create

Features:

- dashboard.view
- reports.create
- reports.view.own
- reports.update.own

Widgets:

- dashboard.myReports
- dashboard.pendingTasks
- dashboard.recentReports

### Social Worker

Routes:

- dashboard
- clients.list
- clients.create
- clients.detail
- clients.edit
- cases.list
- cases.create
- cases.detail
- reports.list
- reports.create

Features:

- dashboard.view
- clients.search
- clients.view.full
- clients.create
- clients.update
- clients.contacts.link
- cases.view
- cases.notes.create
- cases.create
- cases.status.update
- cases.assignVolunteer
- cases.documents.uploadEdit
- reports.create
- reports.view.all
- reports.update.any
- alerts.receiveUrgent

Widgets:

- dashboard.totalClients
- dashboard.activeCases
- dashboard.pendingReports
- dashboard.myReports
- dashboard.pendingTasks
- dashboard.recentReports

### Manager

Routes:

- dashboard
- clients.list
- clients.create
- clients.detail
- clients.edit
- cases.list
- cases.create
- cases.detail
- reports.list
- reports.create
- users.list

Features:

- dashboard.view
- clients.search
- clients.view.full
- clients.create
- clients.update
- clients.delete
- clients.contacts.link
- cases.view
- cases.notes.create
- cases.create
- cases.status.update
- cases.assignVolunteer
- cases.close
- cases.documents.uploadEdit
- cases.documents.delete
- cases.audit
- reports.create
- reports.view.all
- reports.delete
- reports.approveArchive
- alerts.receiveUrgent
- users.invite
- users.assignRoles
- users.stats.view
- users.create
- users.update
- users.activateDeactivate
- users.delete

Widgets:

- dashboard.totalClients
- dashboard.activeCases
- dashboard.pendingReports
- dashboard.urgentCases
- dashboard.myReports
- dashboard.pendingTasks
- dashboard.recentReports

## Page Data APIs

Capabilities do not replace page data APIs. Pages still request dynamic data from their own endpoints.

Examples:

```http
GET /api/v1/dashboard
GET /api/v1/reports?scope=mine&page=1
GET /api/v1/clients?search=...
POST /api/v1/reports
PATCH /api/v1/cases/{caseId}/status
```

The backend must enforce authorization on these business APIs independently. The capability endpoint is for rendering and route gating, not a security boundary.
