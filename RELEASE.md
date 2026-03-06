# Release Checklist

## Pre-release
- Update version in `package.json`.
- Run quality checks:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build:renderer`
  - `npm run build:electron`
- Validate pairing manually (QR + manual + fallback).
- Review `SECURITY_REVIEW.md` and `SECURITY.md`.

## Publish Source Release
1. Create a release branch/tag from `main`.
2. Push tag to GitHub.
3. Draft GitHub Release notes:
   - Features
   - Bug fixes
   - Breaking changes
   - Known limitations (if any)

## Optional: Binary Packaging
- Run `npm run dist` in a clean native environment for target OS.
- Upload generated artifacts from `dist/` to GitHub Release.
