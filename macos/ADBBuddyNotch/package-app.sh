#!/usr/bin/env bash
# Builds ADBBuddyNotch.app (release) and ADBBuddyNotch-<version>.zip next to this script,
# after checking that the packaged app actually launches.
# Usage: ./package-app.sh <version>
set -euo pipefail
cd "$(dirname "$0")"

VERSION="${1:?usage: package-app.sh <version>}"
APP="ADBBuddyNotch.app"
BUNDLE="ADBBuddyNotch_ADBBuddyNotchApp.bundle"

swift build --configuration release
BIN=$(swift build --configuration release --show-bin-path)

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN/ADBBuddyNotchApp" "$APP/Contents/MacOS/"
# The app looks for its resource bundle here first (see NotchStripChrome.swift).
cp -R "$BIN/$BUNDLE" "$APP/Contents/Resources/"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ADBBuddyNotchApp</string>
    <key>CFBundleIdentifier</key>
    <string>com.adbbuddynotch.app</string>
    <key>CFBundleName</key>
    <string>ADB Buddy Notch</string>
    <key>CFBundleDisplayName</key>
    <string>ADB Buddy Notch</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
PLIST

# Launch check. Hide the build directory's copy of the resource bundle first: SwiftPM's
# generated accessor falls back to that absolute path, which only exists on this machine.
mv "$BIN/$BUNDLE" "$BIN/$BUNDLE.hidden"
trap 'mv "$BIN/$BUNDLE.hidden" "$BIN/$BUNDLE"' EXIT
"$APP/Contents/MacOS/ADBBuddyNotchApp" &
PID=$!
sleep 5
if ! kill -0 "$PID" 2>/dev/null; then
  echo "error: packaged app exited during launch" >&2
  exit 1
fi
kill "$PID"
wait "$PID" 2>/dev/null || true

rm -f "ADBBuddyNotch-$VERSION.zip"
zip -qr "ADBBuddyNotch-$VERSION.zip" "$APP"
echo "Wrote $PWD/ADBBuddyNotch-$VERSION.zip"
