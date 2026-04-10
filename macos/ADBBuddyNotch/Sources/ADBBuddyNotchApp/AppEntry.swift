import AppKit
import SwiftUI

// Comment out below to enable DebugPreviewApp
#if !ENABLE_DEBUG_PREVIEW
@main
struct ADBBuddyNotchApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}
#endif

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
