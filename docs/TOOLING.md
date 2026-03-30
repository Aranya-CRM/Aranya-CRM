# Tooling — Git, VS Code, and Cursor

Reference for contributors using Git, Visual Studio Code, or Cursor.

## Git

### Clone

```bash
git clone <repository-url>
cd Aranya-CRM
```

### Daily workflow

```bash
git checkout main
git pull
git checkout -b feature/your-branch
# … make changes …
git add -p
git commit -m "Describe the change"
git push -u origin feature/your-branch
```

Open a pull request against `main` (or the team’s integration branch).

### Useful settings

- Set `user.name` and `user.email` for commits that match your org’s policy.
- Use SSH or HTTPS with a credential helper as recommended by your IT team.

## Visual Studio Code

1. Open the **repository root** (`Aranya-CRM`) or the `frontend/Aranya-CRM` folder as the workspace.
2. Recommended extensions (team baseline):
   - **ESLint** (`dbaeumer.vscode-eslint`)
   - **Prettier** (`esbenp.prettier-vscode`)

The repo may include `.vscode/extensions.json` to suggest these automatically.

### Format on save (optional)

In your user or workspace `settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"]
}
```

## Cursor

Cursor is VS Code–compatible; the same extensions and workspace settings apply.

- Point Cursor at the same folder you use in VS Code (repo root or `frontend/Aranya-CRM`).
- For AI-assisted edits, read **[AGENT.md](../AGENT.md)** at the repo root so the model shares context on stack and conventions.
- Optional: add project rules under `.cursor/rules/` for team-specific instructions (see [Cursor documentation](https://docs.cursor.com)).

## pnpm reminder

Frontend work uses **pnpm** only:

```bash
cd frontend/Aranya-CRM
corepack enable
pnpm install
```

Avoid generating `package-lock.json` in that package.
