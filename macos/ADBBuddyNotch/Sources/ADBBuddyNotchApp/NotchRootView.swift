import AppKit
import ADBBuddyCore
import SwiftUI

struct NotchRootView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        Group {
            if store.isExpanded {
                ExpandedNotchView(store: store)
            } else {
                CollapsedNotchView(store: store)
            }
        }
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
        .sheet(isPresented: $store.isShowingSettings) {
            SettingsSheetView(store: store)
        }
    }
}

private struct CollapsedNotchView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        Button(action: store.toggleExpanded) {
            HStack(spacing: 10) {
                Circle()
                    .fill(store.indicatorColor)
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 1) {
                    Text(store.collapsedTitle)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                    Text(store.collapsedSubtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.72))
                        .lineLimit(1)
                }

                Spacer(minLength: 4)

                Image(systemName: "chevron.down")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.76))
            }
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.black.opacity(0.92))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.08))
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

private struct ExpandedNotchView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(store.expandedTitle)
                        .font(.system(size: 18, weight: .semibold))
                    Text(store.expandedSubtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 12)

                HStack(spacing: 8) {
                    HeaderIconButton(systemName: "arrow.clockwise", action: store.refreshNow)
                    HeaderIconButton(systemName: "gearshape", action: { store.isShowingSettings = true })
                    HeaderIconButton(systemName: "xmark", action: store.collapse)
                }
            }

            if let runtimeError = store.runtimeError, store.viewMode != .adbMissing {
                InlineBanner(text: runtimeError, tint: .red)
            }

            switch store.viewMode {
            case .loading:
                VStack(spacing: 10) {
                    ProgressView()
                    Text("Checking adb and connected devices...")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .adbMissing:
                SetupStateView(store: store)
            case .pairing:
                PairingStateView(store: store)
            case .connected:
                ConnectedStateView(store: store)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.black.opacity(0.97),
                            Color(red: 0.09, green: 0.1, blue: 0.12),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.08))
                )
        )
    }
}

private struct SetupStateView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            InlineBanner(text: "ADB is missing. Save a valid platform-tools/adb path or fall back to auto-detection.", tint: .orange)

            if let settingsMessage = store.settingsMessage {
                InlineBanner(text: settingsMessage, tint: .blue)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Current path")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                Text(store.adbPathInput.isEmpty ? "Auto-detecting from PATH and common SDK locations" : store.adbPathInput)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.86))
                    .textSelection(.enabled)
            }

            HStack(spacing: 10) {
                ActionButton(title: "Open Settings", systemName: "slider.horizontal.3") {
                    store.isShowingSettings = true
                }
                ActionButton(title: "Retry Detection", systemName: "arrow.clockwise") {
                    store.refreshNow()
                }
            }
        }
    }
}

private struct PairingStateView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                Group {
                    if let qrImage = store.qrImage {
                        Image(nsImage: qrImage)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                    } else {
                        ProgressView()
                            .progressViewStyle(.circular)
                    }
                }
                .frame(width: 220, height: 220)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white)
                )

                VStack(alignment: .leading, spacing: 10) {
                    PairingStagePill(stage: store.pairingProgress.stage)
                    Text(store.pairingProgress.detail ?? "Preparing QR pairing...")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)

                    if let androidHost = store.pairingProgress.androidHost {
                        DetailLine(title: "Android host", value: androidHost)
                    }

                    if let serviceName = store.pairingPayload?.serviceName {
                        DetailLine(title: "Service", value: serviceName)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }

            if let error = store.pairingProgress.error {
                InlineBanner(text: error, tint: .red)
            }

            HStack(spacing: 10) {
                ActionButton(title: "Restart QR", systemName: "qrcode") {
                    store.restartPairing()
                }
                ActionButton(title: "Cancel", systemName: "xmark.circle") {
                    store.cancelPairing()
                }
                .foregroundStyle(.secondary)
            }
        }
    }
}

private struct ConnectedStateView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let primary = store.primaryDevice {
                DeviceSummaryCard(device: primary, isPrimary: true)

                if !store.secondaryDevices.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("+\(store.secondaryDevices.count) more connected")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)

                        ForEach(store.secondaryDevices.prefix(3)) { device in
                            DeviceSummaryCard(device: device, isPrimary: false)
                        }
                    }
                }

                HStack(spacing: 10) {
                    ActionButton(title: "Refresh", systemName: "arrow.clockwise") {
                        store.refreshNow()
                    }

                    if primary.isWireless {
                        ActionButton(title: "Disconnect", systemName: "bolt.slash") {
                            Task { await store.disconnect(primary) }
                        }
                    }
                }
            } else {
                Text("No connected devices.")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct SettingsSheetView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("ADB Buddy Settings")
                .font(.system(size: 18, weight: .semibold))

            VStack(alignment: .leading, spacing: 8) {
                Text("ADB executable")
                    .font(.system(size: 13, weight: .medium))
                TextField("/Users/you/Library/Android/sdk/platform-tools/adb", text: $store.adbPathInput)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.body, design: .monospaced))
                Text("Leave blank to auto-detect from PATH and common macOS SDK locations.")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Refresh interval")
                    .font(.system(size: 13, weight: .medium))
                Picker("Refresh interval", selection: $store.refreshIntervalSeconds) {
                    Text("2s").tag(2.0)
                    Text("3s").tag(3.0)
                    Text("5s").tag(5.0)
                    Text("10s").tag(10.0)
                }
                .pickerStyle(.segmented)
            }

            if let settingsMessage = store.settingsMessage {
                InlineBanner(text: settingsMessage, tint: .blue)
            }

            HStack(spacing: 10) {
                ActionButton(title: "Save", systemName: "checkmark") {
                    Task { await store.saveSettings() }
                }
                ActionButton(title: "Restart ADB", systemName: "power") {
                    Task { await store.restartAdbServer() }
                }
                ActionButton(title: "Quit", systemName: "xmark.octagon") {
                    store.quitApp()
                }
            }
        }
        .padding(22)
        .frame(width: 480)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

private struct DeviceSummaryCard: View {
    let device: Device
    let isPrimary: Bool

    private var title: String {
        device.model?.replacingOccurrences(of: "_", with: " ") ?? "Unknown Device"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: isPrimary ? .semibold : .medium))
                Spacer()
                Text(device.status.rawValue.capitalized)
                    .font(.system(size: 11, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.14))
                    .clipShape(Capsule())
            }

            Text(device.serial)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.secondary)

            if let host = device.host, let port = device.port {
                Text("\(host):\(port)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(isPrimary ? Color.white.opacity(0.08) : Color.white.opacity(0.05))
        )
    }
}

private struct PairingStagePill: View {
    let stage: PairingStage

    private var title: String {
        switch stage {
        case .idle:
            return "Idle"
        case .waitingForScan:
            return "Waiting for Scan"
        case .waitingForPairingService:
            return "Waiting for Pairing"
        case .pairing:
            return "Pairing"
        case .waitingForConnectService:
            return "Waiting for Connect"
        case .connecting:
            return "Connecting"
        case .success:
            return "Connected"
        case .error:
            return "Error"
        }
    }

    private var tint: Color {
        switch stage {
        case .success:
            return .green
        case .error:
            return .red
        default:
            return .blue
        }
    }

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(tint.opacity(0.14))
            .clipShape(Capsule())
    }
}

private struct HeaderIconButton: View {
    let systemName: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 12, weight: .semibold))
                .frame(width: 30, height: 30)
                .background(Color.white.opacity(0.08))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }
}

private struct ActionButton: View {
    let title: String
    let systemName: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemName)
                .font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct InlineBanner: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(tint.opacity(0.18))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct DetailLine: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.white.opacity(0.86))
                .textSelection(.enabled)
        }
    }
}
