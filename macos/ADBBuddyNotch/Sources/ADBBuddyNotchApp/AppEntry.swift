import AppKit
import SwiftUI

#if ENABLE_DEBUG_PREVIEW
@main
struct ADBBuddyNotchApp: App {
    var body: some Scene {
        WindowGroup {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 380))], spacing: 24) {
                    Group {
                        PreviewCard(title: "Loading", store: NotchAppState.previewLoading())
                        PreviewCard(title: "ADB Missing", store: NotchAppState.previewAdbMissing())
                        PreviewCard(title: "Pairing – Idle", store: NotchAppState.previewPairingIdle())
                        PreviewCard(title: "Pairing – Waiting for Scan", store: NotchAppState.previewPairing())
                        PreviewCard(title: "Pairing – Waiting for Pairing Service", store: NotchAppState.previewPairingInProgress())
                        PreviewCard(title: "Pairing – Active", store: NotchAppState.previewPairingActive())
                        PreviewCard(title: "Pairing – Waiting for Connect", store: NotchAppState.previewPairingWaitingConnect())
                        PreviewCard(title: "Pairing – Connecting", store: NotchAppState.previewPairingConnecting())
                        PreviewCard(title: "Pairing – Success", store: NotchAppState.previewPairingSuccess())
                        PreviewCard(title: "Pairing – Error", store: NotchAppState.previewPairingError())
                        PreviewCard(title: "Connected – Single Wireless", store: NotchAppState.previewConnectedSingleWireless())
                        PreviewCard(title: "Connected – Single USB", store: NotchAppState.previewConnectedSingleUSB())
                        PreviewCard(title: "Connected – Multiple", store: NotchAppState.previewConnected())
                    }
                }
                .padding(24)
            }
            .frame(minWidth: 400, minHeight: 600)
            .background(Color.black)
            .preferredColorScheme(.dark)
        }
    }
}

struct PreviewCard: View {
    let title: String
    let store: NotchAppState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(.white)

            ExpandedOverlayView(store: store)
                .frame(width: store.panelLayout.size.width, height: store.panelLayout.size.height)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(12)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

#else

@main
struct ADBBuddyNotchApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var overlayController: NotchPanelController?
    private let store = NotchAppState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = NSApp.setActivationPolicy(.accessory)
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.overlayController = NotchPanelController(store: self.store)
            self.overlayController?.launch()
            self.store.launch()
        }
    }
}

#endif
