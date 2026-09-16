# Security Review (2026-03-06)

## Scope
- Electron main process IPC handlers
- ADB command execution paths
- Pairing and mDNS discovery flow
- Local settings persistence
- Repository secret hygiene

## Findings and Actions

### 1) Shell command injection risk (High) -> Fixed
- **Previous**: ADB commands were composed as shell strings.
- **Now**: Uses argument-safe `execFile` with explicit argv in `electron/services/adb.service.ts`.

### 2) Input validation gaps (Medium) -> Fixed
- Added host/port/pairing-code validation in `electron/ipc/adb.handlers.ts`.
- Invalid payloads now fail early with clear errors.

### 3) Pair/connect state ambiguity (Medium) -> Fixed
- Pairing flow now tracks distinct stages (`waiting`, `pairing`, `connecting`, `success`, `error`).
- UI only reports success after connect step succeeds.

### 4) Secret leakage in repository (Low) -> Verified clean
- No API keys, PEM private keys, or credentials found in tracked source.
- Pairing secrets are generated per session and not persisted.

### 5) Local data handling (Informational)
- Settings stored at Electron `userData/settings.json`.
- No remote telemetry or analytics in codebase.

## Residual Risks
- Wireless pairing relies on local network/mDNS behavior; hostile networks may disrupt discovery.
- Trust boundary remains local host execution of `adb`; compromised host environment remains out of scope.

## Recommended Ongoing Practices
- Run dependency audit regularly (`npm audit`) in network-enabled CI.
- Keep Electron/Node dependencies updated.
- Require security checklist in PRs touching IPC or command execution.

## Addendum (2026-09-16)

Finding 1 above ("Shell command injection risk -> Fixed") missed one path:
the adb path check in `verifyAdbPath` still ran `exec` with the
user-configurable `adbPath` interpolated into a shell string. That is now
`execFile` with an explicit argv, matching the rest of `adb.service.ts`.

Two related gaps are also closed:
- `settings:set` now validates its input and only allows known settings
  keys; a submitted `adbPath` is verified as a working `adb` binary before
  it is applied, instead of being written to disk unchecked.
- The `adb:get-path` and `adb:verify-path` IPC channels are removed; path
  detection and verification now happen as part of `settings:set`, so the
  renderer can no longer trigger an unverified path write through a
  separate channel.
