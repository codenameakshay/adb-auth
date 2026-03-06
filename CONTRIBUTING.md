# Contributing

## Development Setup
```bash
npm ci
npm run dev:electron
```

## Before Opening a PR
- Keep changes scoped and documented.
- Run:
  - `npm run build:renderer`
  - `npm run build:electron`
- For pairing changes, include manual test notes (QR/manual, success/failure paths).

## Pull Request Checklist
- [ ] Problem and solution are clearly described
- [ ] No secrets or private data added
- [ ] Build passes locally
- [ ] UI changes include screenshots (if applicable)
- [ ] Behavior changes include reproduction steps

## Commit Guidance
Use clear commit messages (imperative mood), e.g.:
- `fix(pairing): auto-connect after adb pair`
- `docs: add setup and troubleshooting guide`
