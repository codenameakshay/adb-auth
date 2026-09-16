import AppKit
import SwiftUI

#if ENABLE_DEBUG_PREVIEW
@main
struct ADBBuddyNotchApp: App {
    var body: some Scene {
        WindowGroup {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 380))], spacing: 24) {
                    ForEach(NotchAppState.previewCases, id: \.title) { title, store in
                        PreviewCard(title: title, store: store)
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
                .foregroundStyle(.white)

            ExpandedOverlayView(store: store)
                .frame(width: store.viewMode.panelSize.width, height: store.viewMode.panelSize.height)
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
