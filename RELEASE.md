# Release Checklist

## Pre-release

- Update version if applicable.
- Run quality checks:
  - `make build` (macOS app)
  - `make test` (macOS tests)
- Validate pairing manually (QR + manual + fallback).
- Spot-check app states in debug preview (`make preview`).
- Review `SECURITY_REVIEW.md` and `SECURITY.md`.
- Take screenshots of all app states for documentation.

## Publishing macOS App

### Via GitHub Actions

1. Ensure changes are merged to `main`.
2. Create and push a semantic tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The `Release (macOS)` workflow (`.github/workflows/release-macos.yml`) will:
   - Build the macOS app
   - Create a `.app` bundle
   - Package as `.zip` or `.dmg`
   - Create GitHub Release with artifacts

### Manual Trigger (Optional)
- Run `Release (macOS)` workflow from GitHub Actions UI.

## App States for Screenshots

When documenting, capture these states:

| State | Preview Command |
|-------|-----------------|
| Loading | `make preview` → Loading card |
| ADB Missing | `make preview` → ADB Missing card |
| Pairing – Idle | `make preview` → Pairing – Idle card |
| Pairing – Waiting for Scan | `make preview` → Pairing – Waiting for Scan card |
| Pairing – Waiting for Pairing Service | `make preview` → Pairing – Waiting for Pairing Service card |
| Pairing – Active | `make preview` → Pairing – Active card |
| Pairing – Waiting for Connect | `make preview` → Pairing – Waiting for Connect card |
| Pairing – Connecting | `make preview` → Pairing – Connecting card |
| Pairing – Success | `make preview` → Pairing – Success card |
| Pairing – Error | `make preview` → Pairing – Error card |
| Connected – Single Wireless | `make preview` → Connected – Single Wireless card |
| Connected – Single USB | `make preview` → Connected – Single USB card |
| Connected – Multiple | `make preview` → Connected – Multiple card |
