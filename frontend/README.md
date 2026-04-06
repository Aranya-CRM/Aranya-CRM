# Aranya CRM Frontend

This frontend uses React + TypeScript + Vite + Ant Design. The current homepage is the dashboard demo at `/dashboard`.

## Run

```bash
npm install
npm run dev
```

## Dashboard data mode

The dashboard supports API and mock data with one env variable:

- `VITE_DASHBOARD_DATA_MODE=mock`: always use local mock data
- `VITE_DASHBOARD_DATA_MODE=api`: always call backend API; fail if API is unavailable
- `VITE_DASHBOARD_DATA_MODE=auto` (default): call API first, fallback to mock if request fails

Optional API base URL:

- `VITE_API_BASE_URL` (default `/api`)

### Example

```bash
VITE_DASHBOARD_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8080/api
```

## Dashboard API contract (temporary)

`GET /dashboard`

```json
{
  "activeCases": [
    {
      "id": "case-001",
      "title": { "zh": "紧急住房支持", "en": "Emergency Housing Support" },
      "client": { "zh": "释慧明", "en": "Monk Sumedho" },
      "status": { "zh": "审核中", "en": "In Review" }
    }
  ],
  "attentionCases": [
    {
      "id": "attention-001",
      "client": { "zh": "释妙音", "en": "Monk Dhamma" },
      "reason": { "zh": "等待志愿者分配", "en": "Awaiting volunteer assignment" },
      "daysOpen": 5
    }
  ],
  "upcomingAppointments": [
    {
      "id": "appt-001",
      "startsAt": "2026-04-06T10:00:00+08:00",
      "client": { "zh": "释慧明", "en": "Monk Sumedho" },
      "purpose": { "zh": "家访评估", "en": "Home Visit Assessment" }
    }
  ]
}
```

The frontend applies your agreed rule for appointments:

- sorted by appointment date/time (ascending)
- maximum 5 records shown on dashboard

