# Contributing

Thanks for helping improve ADB Auth. This project is **MIT**-licensed; by contributing you agree your work can be distributed under the same license.

## Development setup

```bash
git clone https://github.com/codenameakshay/adb-auth.git
cd adb-auth
npm ci
npm run dev:electron
```

Use `npm run dev:renderer` if you only need the web UI in a browser (Electron APIs will be absent).

## Before you open a PR

- Keep the change **focused** and describe **why** in the PR.
- Run the checks maintainers rely on:

  ```bash
  npm run lint
  npm run typecheck
  npm run build:renderer
  npm run build:electron
  ```

- For **pairing** or **ADB** behavior, add **manual test notes** (QR vs pairing code, success and failure paths, OS if relevant).
- For **UI** changes, attach **screenshots** or a short screen recording when it helps review.
- Do not commit **secrets**, tokens, or machine-specific paths.

## Pull request checklist

Use the [PR template](.github/pull_request_template.md). In short:

- [ ] Problem and solution are clear
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] `npm run build:renderer` and `npm run build:electron` pass
- [ ] No secrets or private data
- [ ] UI changes: screenshots if useful
- [ ] Behavior changes: repro steps + what you tested

## Commit messages

Short, **imperative** subject line, optional scope:

- `fix(pairing): handle missing debug port hint`
- `feat(tray): add refresh devices menu item`
- `docs: refresh README troubleshooting`

## Where things live

| Area | Location |
|------|-----------|
| Renderer (React) | `src/` |
| Electron main | `electron/main.ts` |
| Preload / IPC bridge | `electron/preload.ts`, `electron/ipc/` |
| Shared types & IPC channel names | `shared/` |
| Design context (AI / humans) | `.impeccable.md` |

## Security

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for reporting.

## Code of conduct

Be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
