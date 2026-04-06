import AppKit
import ADBBuddyCore
import SwiftUI

enum PairingLayoutConstants {
    static let qrSide: CGFloat = 220
    static let horizontalSpacing: CGFloat = 16
    static let minimumDetailsWidth: CGFloat = 160
    static let minimumBodyWidth: CGFloat = qrSide + horizontalSpacing + minimumDetailsWidth
}

struct ExpandedOverlayView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        ZStack {
            ScrollView(.vertical, showsIndicators: true) {
                ExpandedOverlayContentView(store: store)
                    .frame(maxWidth: .infinity, alignment: .topLeading)
            }

            if store.isShowingSettings {
                Color.black.opacity(0.5)
                    .contentShape(Rectangle())
                    .onTapGesture { store.isShowingSettings = false }

                SettingsSheetView(store: store)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: .black.opacity(0.35), radius: 24, y: 8)
            }
        }
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
    }
}

private struct ExpandedOverlayContentView: View {
    @ObservedObject var store: NotchAppState

    private static let contentTransition = AnyTransition.asymmetric(
        insertion: .opacity.combined(with: .scale(scale: 0.97, anchor: .top)),
        removal:   .opacity.combined(with: .scale(scale: 0.97, anchor: .top))
    )

    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            if let runtimeError = store.runtimeError, store.viewMode != .adbMissing {
                InlineBanner(text: runtimeError, tint: .red)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            Group {
                switch store.viewMode {
                case .loading:
                    VStack(spacing: 10) {
                        ProgressView()
                        Text("Checking adb...")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .adbMissing:
                    SetupStateView(store: store)
                case .pairing:
                    PairingStateView(store: store)
                        .frame(maxWidth: .infinity, alignment: .center)
                case .connected:
                    ConnectedStateView(store: store)
                }
            }
            .id(store.viewMode)
            .transition(Self.contentTransition)

            // Icon controls at the bottom
            HStack(spacing: 8) {
                HeaderIconButton(systemName: "arrow.clockwise", action: store.refreshNow)
                HeaderIconButton(systemName: "gearshape", action: { store.isShowingSettings = true })
                HeaderIconButton(systemName: "xmark", action: store.dismissExpanded)
            }
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.82), value: store.viewMode)
        .animation(.spring(response: 0.28, dampingFraction: 0.8), value: store.runtimeError != nil)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(Color.black)
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
        VStack(alignment: .center, spacing: 12) {
            PairingStagePill(stage: store.pairingProgress.stage)

            // QR code — hero element
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
            .frame(width: PairingLayoutConstants.qrSide, height: PairingLayoutConstants.qrSide)
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white)
            )

            if let serviceName = store.pairingPayload?.serviceName {
                    Text(serviceName)
                        .font(.system(size: 7, design: .monospaced))
                        .foregroundStyle(.secondary)
            }

            ActionButton(title: "Restart QR", systemName: "qrcode") {
                    store.restartPairing()
            }.foregroundStyle(.secondary)

            // HStack(spacing: 10) {
                
            //     // ActionButton(title: "Cancel", systemName: "xmark.circle") {
            //     //     store.cancelPairing()
            //     // }
            //     .foregroundStyle(.secondary)
            // }

            if let error = store.pairingProgress.error {
                InlineBanner(text: error, tint: .red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }
}

private struct ConnectedStateView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            // Extra inset so content clears the notch strip (~38px from panel top)
            Color.clear.frame(height: 22)

            if let primary = store.primaryDevice {
                DeviceSummaryCard(device: primary, isPrimary: true)

                if !store.secondaryDevices.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("+\(store.secondaryDevices.count) more connected")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
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
        .padding(.horizontal, 20)
    }
}

private struct SettingsSheetView: View {
    @ObservedObject var store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .center) {
                Text("ADB Buddy Settings")
                    .font(.system(size: 18, weight: .semibold))
                Spacer()
                HeaderIconButton(systemName: "xmark") {
                    store.isShowingSettings = false
                }
            }

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
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 12, weight: isPrimary ? .semibold : .medium))
                Spacer()
                Text(device.status.rawValue.capitalized)
                    .font(.system(size: 8, weight: .semibold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.green.opacity(0.14))
                    .clipShape(Capsule())
            }

            Text(device.serial)
                .font(.system(size: 12, design: .monospaced))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
                .foregroundStyle(.secondary)

            if let host = device.host, let port = device.port {
                Text("\(host):\(port)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
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
            .font(.system(size: 8, weight: .semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tint.opacity(0.14))
            .clipShape(Capsule())
            .padding(.top, 20)
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

#if DEBUG
#Preview("Pairing – Waiting for Scan") {
    let store = NotchAppState.previewPairing()
    ExpandedOverlayView(store: store)
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
        .background(Color.black)
}

#Preview("Pairing – In Progress") {
    let store = NotchAppState.previewPairingInProgress()
    ExpandedOverlayView(store: store)
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
        .background(Color.black)
}

#Preview("Connected") {
    let store = NotchAppState.previewConnected()
    ExpandedOverlayView(store: store)
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
        .background(Color.black)
}

#Preview("ADB Missing") {
    let store = NotchAppState.previewAdbMissing()
    ExpandedOverlayView(store: store)
        .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
        .background(Color.black)
}
#endif
