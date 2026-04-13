# Contributing

Thanks for helping improve ADB Buddy. This project is **MIT**-licensed; by contributing you agree your work can be distributed under the same license.

## Projects

This repo contains two related projects:

1. **ADB Buddy Notch** — Native macOS menu bar app (Swift/SwiftUI)
2. **ADB Auth** — Electron + React desktop app (legacy/full-featured)

## macOS App Development

### Quick Start

```bash
git clone https://github.com/codenameakshay/adb-auth.git
cd adb-auth/macos/ADBBuddyNotch

# Build
swift build

# Run with debug preview (shows all UI states)
make preview

# Run tests
swift test
```

### Makefile Commands

| Command | Purpose |
|---------|---------|
| `make preview` | Run debug preview showing all UI states |
| `make build` | Build the release version |
| `make test` | Run Swift tests |
| `make clean` | Clean build artifacts |

### Before You Open a PR

- Keep the change **focused** and describe **why** in the PR.
- Run the checks:
  ```bash
  make build
  make test
  ```
- For **UI** changes, attach **screenshots** or describe the expected visual change.
- Do not commit **secrets**, tokens, or machine-specific paths.

## Electron App Development (Legacy)

```bash
git clone https://github.com/codenameakshay/adb-auth.git
cd adb-auth
npm ci
npm run dev:electron
```

Use `npm run dev:renderer` if you only need the web UI in a browser (Electron APIs will be absent).

### Before You Open a PR (Electron)

```bash
npm run lint
npm run typecheck
npm run build:renderer
npm run build:electron
```

## Pull Request Checklist

Use the [PR template](.github/pull_request_template.md). In short:

- [ ] Problem and solution are clear
- [ ] Relevant build/test commands pass
- [ ] No secrets or private data
- [ ] UI changes: screenshots if useful
- [ ] Behavior changes: repro steps + what you tested

## Commit Messages

Short, **imperative** subject line, optional scope:

- `fix(pairing): handle missing debug port hint`
- `feat(notch): add loading state overlay`
- `docs: refresh README troubleshooting`

## Where Things Live

| Area | Location |
|------|----------|
| macOS App | `macos/ADBBuddyNotch/Sources/` |
| ADBBuddyCore (shared) | `macos/ADBBuddyNotch/Sources/ADBBuddyCore/` |
| Renderer (React) | `src/` |
| Electron main | `electron/main.ts` |
| Preload / IPC bridge | `electron/preload.ts`, `electron/ipc/` |
| Shared types & IPC channel names | `shared/` |
| Design context (AI / humans) | `.impeccable.md` |

## Security

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for reporting.

## Code of Conduct

Be respectful and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
