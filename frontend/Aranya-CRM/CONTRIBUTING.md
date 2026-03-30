# Contributing to Aranya CRM

Thank you for helping improve this project. This document describes how we work together on code and reviews.

## Getting set up

1. Clone the repository and install the frontend dependencies:

   ```bash
   cd frontend/Aranya-CRM
   corepack enable
   pnpm install
   ```

2. Run the app and tests locally before opening a PR:

   ```bash
   pnpm dev
   pnpm lint
   pnpm build
   ```

3. Read [docs/TOOLING.md](docs/TOOLING.md) for Git, editor, and Cursor tips.

## Branching

- Use short, descriptive branch names, for example: `feature/lead-import`, `fix/login-redirect`, `chore/update-deps`.
- Base feature work off the default branch (`main` unless your team agrees otherwise).

## Commits

- Write clear commit messages in the imperative mood (e.g. “Add lead list filter”, not “Added”).
- Keep commits logically scoped; avoid mixing unrelated refactors with feature work when possible.

## Pull requests

- Describe **what** changed and **why** (link issues or tickets when applicable).
- Note any breaking changes, new env vars, or migration steps.
- Ensure `pnpm lint` and `pnpm build` pass for frontend changes.

## Code style

- **TypeScript / React**: follow existing patterns in `frontend/Aranya-CRM`.
- **Formatting**: run `pnpm format` (Prettier) before pushing, or rely on your editor format-on-save.
- **Linting**: fix ESLint issues; do not disable rules broadly without discussion.

## Security

- Never commit API keys, passwords, or production `.env` files.
- Report security issues through the channel your organization uses (do not file public issues with secrets).

## Questions

Prefer asking in the team’s chat or standup when requirements are unclear; update `docs/` or this file when decisions stabilize.
