import AppKit
import Combine
import SwiftUI

@MainActor
private final class FloatingNotchPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

@MainActor
final class NotchPanelController {
    private let store: NotchAppState
    private let panel: FloatingNotchPanel
    private let hostingView: NSHostingView<NotchRootView>
    private var cancellables = Set<AnyCancellable>()

    init(store: NotchAppState) {
        self.store = store
        hostingView = NSHostingView(rootView: NotchRootView(store: store))
        panel = FloatingNotchPanel(
            contentRect: CGRect(origin: .zero, size: store.panelLayout.size),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        panel.isReleasedWhenClosed = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle, .stationary]
        panel.contentView = hostingView

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePanelResignedKey),
            name: NSWindow.didResignKeyNotification,
            object: panel
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleScreenParametersChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )

        store.objectWillChange
            .sink { [weak self] _ in
                DispatchQueue.main.async {
                    self?.syncToState(animated: true)
                }
            }
            .store(in: &cancellables)

        syncToState(animated: false)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    func show() {
        syncToState(animated: false)
        panel.orderFrontRegardless()
    }

    @objc private func handlePanelResignedKey() {
        if store.isExpanded, !store.isShowingSettings {
            store.collapse()
        }
    }

    @objc private func handleScreenParametersChanged() {
        syncToState(animated: false)
    }

    private func syncToState(animated: Bool) {
        hostingView.rootView = NotchRootView(store: store)
        hostingView.frame = CGRect(origin: .zero, size: store.panelLayout.size)
        panel.setContentSize(store.panelLayout.size)
        positionPanel(animated: animated)

        if !panel.isVisible {
            panel.orderFrontRegardless()
        }
    }

    private func positionPanel(animated: Bool) {
        guard let screen = presentationScreen() else { return }
        let size = store.panelLayout.size
        let frame = CGRect(
            x: screen.frame.midX - size.width / 2,
            y: screen.frame.maxY - size.height - 6,
            width: size.width,
            height: size.height
        )

        if animated {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.2
                context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                panel.animator().setFrame(frame, display: true)
            }
        } else {
            panel.setFrame(frame, display: true)
        }
    }

    private func presentationScreen() -> NSScreen? {
        let mouseLocation = NSEvent.mouseLocation
        return NSScreen.screens.first(where: { $0.frame.contains(mouseLocation) }) ?? NSScreen.main ?? NSScreen.screens.first
    }
}
