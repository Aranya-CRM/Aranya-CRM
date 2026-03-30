# AGENT.md — AI assistant context

Use this file when working in this repository with automated coding agents (Cursor, Copilot, etc.).

## Product

**Aranya CRM** — internal CRM for the Aranya organization. The active web client lives under `frontend/Aranya-CRM/`.

## Tech stack (frontend)

- **React 19**, **TypeScript**, **Vite 8**
- Package manager: **pnpm** only (`packageManager` in `package.json`; lockfile: `pnpm-lock.yaml`)
- Lint: **ESLint** (flat config: `eslint.config.js`)
- Format: **Prettier** (`.prettierrc`)

## Commands (from `frontend/Aranya-CRM`)

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format
```

Do not introduce `npm` or `yarn` lockfiles for the frontend app.

## Conventions

- Prefer small, focused changes; match existing patterns and naming.
- Search the codebase before adding duplicate utilities or components.
- Environment: Vite client env vars must use the `VITE_` prefix.
- Do not commit `.env` or secrets.

## Boundaries

- **Infrastructure**: PostgreSQL-related Docker files live under `infra/` — coordinate DB changes with the team.
- **API contracts**: See `docs/` (e.g. API spec drafts) when touching backend integration.

## Where to look

| Area | Path |
|------|------|
| App entry | `frontend/Aranya-CRM/src/main.tsx` |
| UI root | `frontend/Aranya-CRM/src/App.tsx` |
| Vite config | `frontend/Aranya-CRM/vite.config.ts` |
| Human contributor guide | `CONTRIBUTING.md` |

If repository rules exist under `.cursor/rules/`, treat them as additive to this file.
