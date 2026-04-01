# ADB Auth

**ADB Auth** is a small **Electron + React** desktop app for Android **wireless debugging**: pair over Wi‑Fi (QR or pairing code), connect to the debug port, and watch what `adb` reports—all **local**, with **no telemetry** or cloud backend.

**Repository:** [github.com/codenameakshay/adb-auth](https://github.com/codenameakshay/adb-auth)

## Features

- **Pair over Wi‑Fi** — QR flow (Android 11+ Wireless debugging) or **pairing code** + optional debug port.
- **Devices** — Live list from `adb` (connected, offline, unauthorized, etc.), optional **mDNS** hints on your LAN, refresh on your schedule.
- **Settings** — `adb` path, refresh interval, **minimize to system tray**, start/stop ADB server.
- **System tray** — Right‑click the tray icon for quick actions: open app, hide window, jump to **Devices / Pair / Settings**, refresh device list, copy this machine’s LAN IP, restart ADB server, quit.
- **Sidebar** — Collapse to an icon‑only rail (persisted); expand again (desktop).
- **Quick start** — Dismissible tips on first use; empty states point you to Pair and Settings.
- **Status area** — Footer chips for ADB found/missing, connected count, and network summary (click network chip to copy IP when shown).

## Security and privacy

- No telemetry, analytics, or cloud backend.
- The app only runs your local **`adb`** binary and reads its output.
- Pairing and settings stay on disk under Electron **`userData`** (see `userData/settings.json`).

Read more:

- [SECURITY.md](SECURITY.md) — how to report vulnerabilities  
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) — review notes and findings  

## Requirements

- **Node.js** 20+ and **npm** 10+
- **Android platform-tools** (`adb`) on `PATH` or set in **Settings**
- **Android 11+** for wireless pairing (as required by the OS)
- **OpenSSL** on `PATH` (used by the pairing flow on some setups)

## Quick start (development)

```bash
git clone https://github.com/codenameakshay/adb-auth.git
cd adb-auth
npm ci
npm run dev:electron
```

For renderer-only (browser, no Electron shell):

```bash
npm run dev:renderer
```

## Native macOS notch app

There is now a separate native macOS app prototype under `macos/ADBBuddyNotch/`. It is a SwiftUI/AppKit utility that sits in the notch area, shows QR pairing when no device is connected, and shows the current connected device when one is available.

Build it:

```bash
cd macos/ADBBuddyNotch
swift build
```

Run it locally:

```bash
cd macos/ADBBuddyNotch
swift run ADBBuddyNotchApp
```

Run the native tests:

```bash
cd macos/ADBBuddyNotch
swift test
```

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev:electron` | Vite + Electron (full app) |
| `npm run dev:renderer` | Vite dev server only |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (renderer + Electron) |
| `npm run build:renderer` | Production React bundle → `dist/` |
| `npm run build:electron` | Compile Electron main/preload → `dist-electron/` |
| `npm run dist` | Build + package installers (see [RELEASE.md](RELEASE.md)) |
| `npm run preview` | Preview production renderer build |

## Build (from source)

```bash
npm run build:renderer
npm run build:electron
```

Packaged installers (local, no publish):

```bash
npm run dist
```

## Using pairing

### QR pairing

1. In the app, open **Pair** and choose **QR code**, then start pairing.
2. On the phone: **Settings → Developer options → Wireless debugging → Pair device with QR code**.
3. Scan the QR code shown in the app.
4. The app drives `adb pair` / `adb connect` as the phone exposes pairing and debug endpoints.

### Pairing code

1. On the phone: **Wireless debugging → Pair device with pairing code**.
2. Enter the **IP**, **pairing port**, and **code** in the app (and the **debug port** when the phone shows it—recommended).
3. The app pairs, then connects (or asks for the debug port if needed).

## Tray menu (system icon)

Right‑click the **ADB Auth** tray icon for shortcuts: show/hide the window, open **Devices**, **Pair**, or **Settings**, **refresh** the device list, **copy this computer’s IP**, **restart the ADB server**, or **Quit**.  
(System notifications may be used only when an action fails, e.g. restart ADB or missing IP—enable them for the app in OS settings if you want those messages.)

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| Paired but not connected | Enter the **debug port** in the manual flow; some networks block mDNS. |
| Stuck on debug endpoint | Keep **Wireless debugging** open on the phone; retry or refresh **Devices**. |
| ADB not found | Set the full path to `adb` in **Settings** (platform-tools). |
| Pairing fails | Same Wi‑Fi for PC and phone; avoid guest Wi‑Fi / AP isolation / VPN that blocks LAN. |

## Tech stack

- **Electron** (main + preload), **React 19**, **TypeScript**, **Vite 7**, **Tailwind CSS v4**, **React Router** (hash routing for `file://` loads).

Design notes for contributors live in [.impeccable.md](.impeccable.md) (product tone, accessibility, tokens).

## Open source

| Resource | Link |
|----------|------|
| License | [LICENSE](LICENSE) (MIT) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Code of conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Releases | [RELEASE.md](RELEASE.md) |
| Issues — bug | [Bug report](.github/ISSUE_TEMPLATE/bug_report.md) |
| Issues — idea | [Feature request](.github/ISSUE_TEMPLATE/feature_request.md) |

## Release builds

CI builds **Linux (AppImage)** and **Windows (NSIS)** from tags; see [RELEASE.md](RELEASE.md). macOS artifacts are not produced in CI (signing/notarization); you can still build locally.
