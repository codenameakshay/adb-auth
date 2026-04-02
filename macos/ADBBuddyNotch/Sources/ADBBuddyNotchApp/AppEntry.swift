import AppKit
import SwiftUI

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
    private var overlayController: OverlayController?
    private let store = NotchAppState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = NSApp.setActivationPolicy(.accessory)
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.overlayController = OverlayController(store: self.store)
            self.overlayController?.launch()
            self.store.launch()
        }
    }
}
