# Aranya CRM

CRM system for the Aranya organization.

## Repository layout

| Path | Description |
|------|-------------|
| [`frontend/Aranya-CRM/`](frontend/Aranya-CRM/) | Web app (React, TypeScript, Vite) |
| [`infra/`](infra/) | Infrastructure (e.g. Docker Compose for PostgreSQL) |
| [`docs/`](docs/) | API notes, meeting notes, tooling guides |

## Quick start (frontend)

Prerequisites: **Node.js 18+** (LTS recommended) and **pnpm** (via [Corepack](https://nodejs.org/api/corepack.html)).

```bash
cd frontend/Aranya-CRM
corepack enable
pnpm install
pnpm dev
```

See the [frontend README](frontend/Aranya-CRM/README.md) for scripts, environment variables, and troubleshooting.

## Documentation

- **[AGENT.md](AGENT.md)** — Context for AI coding assistants (stack, conventions, boundaries).
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Branches, commits, reviews, and how to propose changes.
- **[docs/TOOLING.md](docs/TOOLING.md)** — Git workflow, VS Code, and Cursor.

## License

Proprietary — Aranya organization (unless otherwise stated).
