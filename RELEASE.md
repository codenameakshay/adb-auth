# Release Checklist

## Pre-release
- Update version in `package.json`.
- If users will notice behavior or UI changes, update [README.md](README.md) (features, troubleshooting, tray section) and note changes in release notes / changelog if you maintain one.
- Run quality checks:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build:renderer`
  - `npm run build:electron`
- Validate pairing manually (QR + manual + fallback).
- Spot-check **tray menu** actions (navigate, refresh, copy IP, restart ADB) on the target OS.
- Review `SECURITY_REVIEW.md` and `SECURITY.md`.

## Publish via GitHub Actions
1. Ensure changes are merged to `main`.
2. Create and push a semantic tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The `Release` workflow (`.github/workflows/release.yml`) will:
   - build Linux AppImage and Windows NSIS installer
   - upload artifacts
   - create/update GitHub Release with generated notes.

## Manual Trigger (Optional)
- Run `Release` workflow from GitHub Actions UI with `tag_name` input to republish artifacts for an existing tag.

## Notes
- Release workflow currently targets Linux + Windows.
- macOS release is intentionally excluded because code-signing/notarization setup is required.
