# Aranya CRM — Frontend

React + TypeScript + Vite SPA for Aranya CRM.

## Prerequisites

- **Node.js** 18 or newer (22 LTS is fine).
- **pnpm** — this repo pins the version in `packageManager`. Use [Corepack](https://nodejs.org/api/corepack.html) so everyone gets the same pnpm:

  ```bash
  corepack enable
  ```

## Install

From this directory (`frontend/Aranya-CRM`):

```bash
pnpm install
```

Commit `pnpm-lock.yaml` with your changes; do not use npm’s `package-lock.json` here.

## Environment

Copy or create a `.env` file as needed for local API URLs and secrets. `.env` is gitignored — do not commit secrets.

Example (adjust to your backend):

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000
```

Vite exposes only variables prefixed with `VITE_` to client code.

## Run

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Dev server with HMR (default: http://localhost:5173) |
| `pnpm build`        | Typecheck + production build → `dist/`               |
| `pnpm preview`      | Serve the production build locally                   |
| `pnpm lint`         | ESLint                                               |
| `pnpm format`       | Prettier — write                                     |
| `pnpm format:check` | Prettier — check only                                |

## Lint-staged

`lint-staged` is configured in `package.json` for staged `*.{js,jsx,ts,tsx}` files. Wire it to Git with a tool such as [Husky](https://typicode.github.io/husky/) (`pnpm exec lint-staged` in a `pre-commit` hook), or run `pnpm exec lint-staged` manually before committing.

## Project docs (repo root)

- [Repository README](../../README.md)
- [AGENT.md](../../AGENT.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [Tooling (Git, VS Code, Cursor)](../../docs/TOOLING.md)
