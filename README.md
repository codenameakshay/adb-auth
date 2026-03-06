# ADB Auth

ADB Auth is a desktop app (Electron + React) for Android wireless debugging workflows:
- Pair via QR code (Android 11+ Wireless Debugging)
- Pair via pairing code
- Auto-connect to wireless debug endpoint
- View connected/offline devices and manage ADB server state

## Security and Privacy
- No telemetry, analytics, or cloud backend.
- App executes only your local `adb` binary.
- Pairing/session state is local-only.
- Settings are stored in Electron `userData/settings.json`.

See:
- [SECURITY.md](SECURITY.md) for vulnerability reporting
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for current review findings

## Requirements
- Node.js 20+ (recommended)
- npm 10+
- Android platform-tools (`adb`) installed and available in PATH, or configured in-app
- Android 11+ for wireless pairing
- OpenSSL available on system PATH (used by pairing flow on some environments)

## Quick Start (Development)
```bash
git clone https://github.com/<your-username>/adb-auth.git
cd adb-auth
npm ci
npm run dev:electron
```

## Build
```bash
npm run build:renderer
npm run build:electron
```

## Local Packaging (no publish)
```bash
npm run dist
```

## Using Pairing

### QR Pairing
1. Open app: `Pair Device` -> `QR Code`.
2. On phone: `Developer options` -> `Wireless debugging` -> `Pair device with QR code`.
3. Scan QR.
4. App waits for pairing service, runs `adb pair`, then waits for debug endpoint and runs `adb connect`.

### Manual Pairing
1. On phone: `Wireless debugging` -> `Pair device with pairing code`.
2. Enter IP, pairing port, and 6-digit code.
3. (Recommended) Enter debug port shown by phone.
4. App pairs and then connects.

## Troubleshooting
- `Paired but not connected`: Provide debug port in manual flow; some networks block mDNS discovery.
- `Waiting for debug endpoint`: Keep phone Wireless Debugging screen open, then retry.
- `ADB not found`: set ADB path in Settings.
- `Pairing fails`: ensure both devices are on same Wi-Fi and no VPN isolation is active.

## Open Source
- License: MIT (see [LICENSE](LICENSE))
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Release
- Release checklist: [RELEASE.md](RELEASE.md)
