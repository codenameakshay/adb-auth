# Security Policy

## Supported Versions
Only the latest `main` branch and the latest tagged release are supported.

## Reporting a Vulnerability
Please do not open public issues for security vulnerabilities.

Use GitHub private vulnerability reporting (Security Advisories / Report a vulnerability) for this repository.
If private reporting is unavailable, contact the maintainers directly through repository contact channels.

Include:
- Affected version/commit
- Reproduction steps
- Impact assessment
- Suggested mitigation (if available)

Maintainers will acknowledge reports promptly and provide remediation updates.

## Security Model Notes
- The app invokes local `adb` binary and parses output.
- No remote backend and no telemetry.
- No bundled API keys or secrets.
- Settings are stored locally in Electron user-data path.
- The **system tray** menu can copy your machine’s LAN IP to the **system clipboard** and may show **local OS notifications** for failures (e.g. ADB restart errors). No data is sent to a third party by those actions.
- **mDNS** discovery listens on the local network for wireless-debug advertisements; it does not upload discovered data off-device.
