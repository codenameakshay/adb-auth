import AppKit
import Combine
import SwiftUI

@MainActor
private final class ExpandedOverlayPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

@MainActor
final class OverlayController: NSObject {
    private let store: NotchAppState
    private let stripPanel: NSPanel
    private let stripIconContainer: NSView
    private let stripIconCluster: NotchStripIconClusterView
    private let expandedPanel: ExpandedOverlayPanel
    private let expandedHostingView: NSHostingView<ExpandedOverlayView>

    private var cancellables = Set<AnyCancellable>()
    private var localMonitor: Any?
    private var globalMonitor: Any?
    private var stripScreenLayoutAttempts = 0

    init(store: NotchAppState) {
        self.store = store

        let strip = NotchStripWindowFactory.makePanel { [weak store] in
            store?.toggleExpanded()
        }
        self.stripPanel = strip.panel
        self.stripIconContainer = strip.iconContainer
        self.stripIconCluster = strip.iconCluster

        self.expandedHostingView = NSHostingView(
            rootView: ExpandedOverlayView(store: store)
        )

        self.expandedPanel = ExpandedOverlayPanel(
            contentRect: CGRect(origin: .zero, size: OverlayLayout.expandedSurface),
            styleMask: [.titled, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        super.init()

        configureStripPanel()
        configureExpandedPanel()
        syncStripChrome()
        syncExpandedContent()
        installObservers()
    }

    func launch() {
        syncStripChrome()
        stripPanel.orderFrontRegardless()
        DispatchQueue.main.async { [weak self] in
            self?.syncStripChrome()
            self?.stripPanel.orderFrontRegardless()
        }
    }

    private func configureStripPanel() {
        stripPanel.alphaValue = 1
    }

    private func configureExpandedPanel() {
        expandedPanel.isReleasedWhenClosed = false
        expandedPanel.isOpaque = false
        expandedPanel.backgroundColor = .clear
        expandedPanel.hasShadow = true
        expandedPanel.hidesOnDeactivate = false
        expandedPanel.level = .floating
        expandedPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        expandedPanel.titleVisibility = .hidden
        expandedPanel.titlebarAppearsTransparent = true
        expandedPanel.isMovableByWindowBackground = false
        expandedPanel.standardWindowButton(.closeButton)?.isHidden = true
        expandedPanel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        expandedPanel.standardWindowButton(.zoomButton)?.isHidden = true
        expandedPanel.contentView = expandedHostingView
    }

    private func installObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleScreenParametersChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )

        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(handleActiveSpaceChanged),
            name: NSWorkspace.activeSpaceDidChangeNotification,
            object: nil
        )

        store.$isExpanded
            .sink { [weak self] _ in
                self?.syncExpandedSurface(animated: true)
            }
            .store(in: &cancellables)

        store.$panelLayout
            .sink { [weak self] _ in
                self?.syncExpandedSurface(animated: false)
            }
            .store(in: &cancellables)

        store.$isShowingSettings
            .sink { [weak self] _ in
                self?.syncExpandedContent()
            }
            .store(in: &cancellables)

        store.objectWillChange
            .sink { [weak self] _ in
                DispatchQueue.main.async {
                    self?.refreshStripIconCluster()
                }
            }
            .store(in: &cancellables)

        localMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown, .keyDown]) { [weak self] event in
            guard let self else { return event }
            return self.handle(event: event)
        }

        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] event in
            self?.handleGlobalClick(event)
        }
    }

    @objc private func handleScreenParametersChanged() {
        syncStripChrome()
        syncExpandedSurface(animated: false)
    }

    @objc private func handleActiveSpaceChanged() {
        syncStripChrome()
    }

    private func handle(event: NSEvent) -> NSEvent? {
        if event.type == .keyDown, event.keyCode == 53, store.isExpanded {
            store.dismissExpanded()
            return nil
        }

        guard store.isExpanded else { return event }
        guard event.type == .leftMouseDown || event.type == .rightMouseDown else { return event }

        let location = NSEvent.mouseLocation
        let insideExpanded = expandedPanel.frame.contains(location)
        let insideStrip = stripPanel.frame.contains(location)

        if !insideStrip && !insideExpanded {
            store.dismissExpanded()
        }

        return event
    }

    private func handleGlobalClick(_ event: NSEvent) {
        guard store.isExpanded else { return }
        let location = NSEvent.mouseLocation
        let insideExpanded = expandedPanel.frame.contains(location)
        let insideStrip = stripPanel.frame.contains(location)

        if !insideStrip && !insideExpanded {
            store.dismissExpanded()
        }
    }

    private func syncExpandedSurface(animated: Bool) {
        syncExpandedContent()
        positionExpandedPanel(animated: animated)

        if store.isExpanded {
            expandedPanel.alphaValue = 1
            NSApp.activate(ignoringOtherApps: true)
            expandedPanel.makeKeyAndOrderFront(nil)
            expandedPanel.orderFrontRegardless()
        } else {
            expandedPanel.orderOut(nil)
        }

        stripPanel.orderFrontRegardless()
    }

    private func refreshStripIconCluster() {
        stripIconCluster.sync(from: store)
    }

    private func syncExpandedContent() {
        expandedHostingView.rootView = ExpandedOverlayView(store: store)
        expandedHostingView.frame = CGRect(origin: .zero, size: store.panelLayout.size)
        expandedPanel.setContentSize(store.panelLayout.size)
    }

    private func syncStripChrome() {
        guard let screen = NSScreen.adbBuddyHostScreen() else {
            if stripScreenLayoutAttempts < 25 {
                stripScreenLayoutAttempts += 1
                DispatchQueue.main.async { [weak self] in
                    self?.syncStripChrome()
                }
            }
            return
        }
        stripScreenLayoutAttempts = 0
        let rawThickness = NSStatusBar.system.thickness
        let thickness = max(
            rawThickness > 0.5 ? rawThickness : NotchStripLayoutConstants.minimumMenuBarThickness,
            NotchStripLayoutConstants.minimumMenuBarThickness
        )
        let inputs = screen.adbBuddyStripInputs(menuBarThickness: thickness)
        let stripFrame = NotchStripLayout.stripFrame(inputs: inputs)
        stripPanel.setFrame(stripFrame, display: true)
        stripPanel.level = .statusBar
        stripPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        let iconScreen = NotchStripLayout.iconHitFrame(stripFrame: stripFrame)
        NotchStripWindowFactory.syncIconCluster(
            iconContainer: stripIconContainer,
            iconCluster: stripIconCluster,
            iconFrameScreen: iconScreen,
            panelFrameScreen: stripFrame
        )

        refreshStripIconCluster()
        stripPanel.orderFrontRegardless()
    }

    private func positionExpandedPanel(animated: Bool) {
        let anchorFrame = stripPanel.frame
        guard let screen = stripPanel.screen ?? NSScreen.adbBuddyHostScreen() ?? NSScreen.main else {
            return
        }
        let expandedFrame = OverlayGeometry.expandedOverlayFrame(
            anchorFrame: anchorFrame,
            screenFrame: screen.frame
        )

        if animated {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.18
                context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                expandedPanel.animator().setFrame(expandedFrame, display: true)
            }
        } else {
            expandedPanel.setFrame(expandedFrame, display: true)
        }
    }
}
