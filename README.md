# ADB Buddy

**ADB Buddy** is a native macOS utility that sits in your Mac's notch/menu bar area and helps you manage Android wireless debugging. It shows your connected devices at a glance, and provides a QR code for easy pairing—all **local**, with **no telemetry** or cloud backend.

**Repository:** [github.com/codenameakshay/adb-auth](https://github.com/codenameakshay/adb-auth)

## macOS App Features

- **Menu Bar Presence** — Sits in the notch/menu bar area, showing device status at a glance
- **QR Code Pairing** — Native QR code display for seamless wireless pairing with Android 11+
- **Multi-Device Support** — Shows primary device and indicates when multiple devices are connected
- **Dark Mode Optimized** — Designed specifically for dark environments with consistent black UI
- **Lightweight** — Pure Swift/SwiftUI, minimal resource footprint
- **Settings** — Configure ADB path and refresh interval

## App States

The app has several visual states:

| State | Description |
|-------|-------------|
| **Loading** | Initial startup, checking for ADB |
| **ADB Missing** | ADB not found, prompts to configure path |
| **Pairing** | Ready to pair or in the process of pairing (8 sub-states) |
| **Connected** | Device(s) connected, shows device info |

### Pairing Sub-States

When pairing, you'll see these stages:
1. **Idle** — Ready to start pairing
2. **Waiting for Scan** — QR code displayed, waiting for device to scan
3. **Waiting for Pairing** — Device scanned, waiting for pairing confirmation
4. **Pairing** — Actively pairing with device
5. **Waiting for Connect** — Pairing successful, waiting for connect endpoint
6. **Connecting** — Establishing connection
7. **Success** — Connected successfully
8. **Error** — Pairing/connection failed

## Requirements (macOS)

- **macOS 14+** (Sonoma or later)
- **Android platform-tools** (`adb`) on `PATH` or set in Settings
- **Android 11+** for wireless pairing (as required by the OS)

## Quick Start (macOS)

### Development

```bash
git clone https://github.com/codenameakshay/adb-auth.git
cd adb-auth/macos/ADBBuddyNotch

# Build
swift build

# Run tests
swift test

# Run with debug preview (see all states in one window)
make preview
```

### Makefile Commands

| Command | Purpose |
|---------|---------|
| `make preview` | Run debug preview app showing all UI states |
| `make build` | Build the macOS app |
| `make test` | Run Swift tests |
| `make clean` | Clean build artifacts |

### Using the App

1. **Launch the app** — The app appears in your menu bar/notch area
2. **Initial State** — If ADB is not found, you'll see the ADB Missing state
3. **Configure ADB** — Click the settings icon to set ADB path if needed
4. **Pair Device** — When no device is connected, the app shows QR pairing mode
5. **Scan QR** — On your Android device: Settings → Developer Options → Wireless Debugging → Pair device with QR code
6. **Connected** — Once paired and connected, the app shows your device info

---

# ADB Auth (Electron)

**ADB Auth** is a full-featured **Electron + React** desktop app for Android **wireless debugging**: pair over Wi‑Fi (QR or pairing code), connect to the debug port, and watch what `adb` reports—all **local**, with **no telemetry** or cloud backend.

Available for **Windows** and **Linux**.

## Features (Electron)

- **Pair over Wi‑Fi** — QR flow (Android 11+ Wireless debugging) or **pairing code** + optional debug port.
- **Devices** — Live list from `adb` (connected, offline, unauthorized, etc.), optional **mDNS** hints on your LAN, refresh on your schedule.
- **Settings** — `adb` path, refresh interval, **minimize to system tray**, start/stop ADB server.
- **System tray** — Right‑click the tray icon for quick actions: open app, hide window, jump to **Devices / Pair / Settings**, refresh device list, copy this machine's LAN IP, restart ADB server, quit.
- **Sidebar** — Collapse to an icon‑only rail (persisted); expand again (desktop).
- **Quick start** — Dismissible tips on first use; empty states point you to Pair and Settings.
- **Status area** — Footer chips for ADB found/missing, connected count, and network summary (click network chip to copy IP when shown).

## Requirements (Electron)

- **Node.js** 20+ and **npm** 10+
- **Android platform-tools** (`adb`) on `PATH` or set in **Settings**
- **Android 11+** for wireless pairing (as required by the OS)
- **OpenSSL** on `PATH** (used by the pairing flow on some setups)

## Quick Start (Electron)

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

## Scripts (Electron)

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

## Build (Electron)

```bash
npm run build:renderer
npm run build:electron
```

Packaged installers (local, no publish):

```bash
npm run dist
```

## Using Pairing (Electron)

### QR pairing

1. In the app, open **Pair** and choose **QR code**, then start pairing.
2. On the phone: **Settings → Developer options → Wireless debugging → Pair device with QR code**.
3. Scan the QR code shown in the app.
4. The app drives `adb pair` / `adb connect` as the phone exposes pairing and debug endpoints.

### Pairing code

1. On the phone: **Wireless debugging → Pair device with pairing code**.
2. Enter the **IP**, **pairing port**, and **code** in the app (and the **debug port** when the phone shows it—recommended).
3. The app pairs, then connects (or asks for the debug port if needed).

## Tray Menu (Electron)

Right‑click the **ADB Auth** tray icon for shortcuts: show/hide the window, open **Devices**, **Pair**, or **Settings**, **refresh** the device list, **copy this computer's IP**, **restart the ADB server**, or **Quit**.  
(System notifications may be used only when an action fails, e.g. restart ADB or missing IP—enable them for the app in OS settings if you want those messages.)

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Paired but not connected | Enter the **debug port** in the manual flow; some networks block mDNS. |
| Stuck on debug endpoint | Keep **Wireless debugging** open on the phone; retry or refresh **Devices**. |
| ADB not found | Set the full path to `adb` in **Settings** (platform-tools). |
| Pairing fails | Same Wi‑Fi for PC and phone; avoid guest Wi‑Fi / AP isolation / VPN that blocks LAN. |

---

## Security and Privacy

- No telemetry, analytics, or cloud backend
- The app only runs your local **`adb`** binary and reads its output
- All data stays on your local machine

## Tech Stack

- **macOS App:** Swift 6 / SwiftUI / AppKit / Swift Package Manager
- **Electron App:** Electron (main + preload), React 19, TypeScript, Vite 7, Tailwind CSS v4

Design notes for contributors live in [.impeccable.md](.impeccable.md) (product tone, accessibility, tokens).

## Open Source

| Resource | Link |
|----------|------|
| License | [LICENSE](LICENSE) (MIT) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Code of conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Releases | [RELEASE.md](RELEASE.md) |
| Issues — bug | [Bug report](.github/ISSUE_TEMPLATE/bug_report.md) |
| Issues — idea | [Feature request](.github/ISSUE_TEMPLATE/feature_request.md) |

## Release Builds

- **macOS:** CI builds release artifacts via `Release (macOS)` workflow. Tag with `macos-v*` prefix.
- **Windows/Linux:** CI builds Linux AppImage and Windows NSIS installer via `Release` workflow. Tag with `v*` prefix.

See [RELEASE.md](RELEASE.md) for details.
