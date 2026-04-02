import AppKit
import Combine
import CoreVideo
import SwiftUI

@MainActor
final class NotchPanelController: NSObject {

    // MARK: - Stored state

    private let store: NotchAppState
    private let panel: NSPanel
    private let rootView: NotchPanelRootView

    private var animator: SpringAnimator
    private var displayLink: CVDisplayLink?
    private var lastTimestamp: Double = 0

    /// Computed once when the strip layout is first resolved.
    private var collapsedFrame: CGRect = .zero
    private let expandedSize = OverlayLayout.expandedSurface
    private let screenMargin: CGFloat = 8

    private var cancellables = Set<AnyCancellable>()
    private var localMonitor: Any?
    private var globalMonitor: Any?
    private var layoutAttempts = 0

    // MARK: - Init

    init(store: NotchAppState) {
        self.store = store

        let root = NotchPanelRootView(store: store, onTap: { [weak store] in
            store?.toggleExpanded()
        })
        self.rootView = root

        let p = NSPanel(
            contentRect: .zero,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        p.isReleasedWhenClosed = false
        p.isOpaque = false
        p.backgroundColor = .clear
        p.hasShadow = false
        p.hidesOnDeactivate = false
        p.ignoresMouseEvents = false
        p.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        p.contentView = root
        root.autoresizingMask = [.width, .height]
        self.panel = p

        // Placeholder animator — real targets set in syncStripLayout().
        self.animator = SpringAnimator(
            width: SpringState(position: 0, target: 0),
            height: SpringState(position: 0, target: 0),
            midX: SpringState(position: 0, target: 0)
        )

        super.init()
        installObservers()
    }

    // MARK: - Launch

    func launch() {
        syncStripLayout()
        panel.level = .statusBar
        panel.orderFrontRegardless()
        // Retry in case screen info isn't ready yet.
        DispatchQueue.main.async { [weak self] in
            self?.syncStripLayout()
            self?.panel.orderFrontRegardless()
        }
    }

    // MARK: - Observers

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
            .sink { [weak self] isExpanded in
                self?.handleExpandedChange(isExpanded)
            }
            .store(in: &cancellables)

        store.$panelLayout
            .dropFirst()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                rootView.refreshContent(store: store)
            }
            .store(in: &cancellables)

        store.$isShowingSettings
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                rootView.refreshContent(store: store)
            }
            .store(in: &cancellables)

        store.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                rootView.iconCluster.sync(from: store)
            }
            .store(in: &cancellables)

        localMonitor = NSEvent.addLocalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown, .keyDown]
        ) { [weak self] event in
            self?.handle(localEvent: event) ?? event
        }

        globalMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown]
        ) { [weak self] event in
            self?.handleGlobalClick(event)
        }
    }

    @objc private func handleScreenParametersChanged() {
        syncStripLayout()
    }

    @objc private func handleActiveSpaceChanged() {
        panel.orderFrontRegardless()
    }

    // MARK: - Expand / collapse

    private func handleExpandedChange(_ isExpanded: Bool) {
        guard collapsedFrame != .zero else { return }
        guard let screen = panel.screen ?? NSScreen.adbBuddyHostScreen() else { return }

        if !isExpanded {
            rootView.snapToCollapsed()
        }

        let targetWidth: CGFloat
        let targetHeight: CGFloat
        let targetMidX: CGFloat

        if isExpanded {
            targetWidth = expandedSize.width
            targetHeight = expandedSize.height
            targetMidX = screen.frame.midX
            NSApp.activate(ignoringOtherApps: true)
            panel.makeKeyAndOrderFront(nil)
        } else {
            targetWidth = collapsedFrame.width
            targetHeight = collapsedFrame.height
            targetMidX = collapsedFrame.midX
        }

        animator.width.target = targetWidth
        animator.height.target = targetHeight
        animator.midX.target = targetMidX

        startDisplayLink()
    }

    // MARK: - Strip layout

    private func syncStripLayout() {
        guard let screen = NSScreen.adbBuddyHostScreen() else {
            if layoutAttempts < 25 {
                layoutAttempts += 1
                DispatchQueue.main.async { [weak self] in self?.syncStripLayout() }
            }
            return
        }
        layoutAttempts = 0

        let rawThickness = NSStatusBar.system.thickness
        let thickness = max(
            rawThickness > 0.5 ? rawThickness : NotchStripLayoutConstants.minimumMenuBarThickness,
            NotchStripLayoutConstants.minimumMenuBarThickness
        )

        let inputs = screen.adbBuddyStripInputs(menuBarThickness: thickness)
        let stripFrame = NotchStripLayout.stripFrame(inputs: inputs)
        collapsedFrame = stripFrame
        rootView.collapsedHeight = stripFrame.height

        // If currently collapsed and not animating, snap to strip frame immediately.
        if !store.isExpanded && displayLink == nil {
            panel.setFrame(stripFrame, display: true)
            animator.width = SpringState(position: stripFrame.width, target: stripFrame.width)
            animator.height = SpringState(position: stripFrame.height, target: stripFrame.height)
            animator.midX = SpringState(position: stripFrame.midX, target: stripFrame.midX)
        }

        rootView.iconCluster.sync(from: store)
        panel.level = .statusBar
        panel.orderFrontRegardless()
    }

    // MARK: - Display link

    private func startDisplayLink() {
        guard displayLink == nil else { return }
        var dl: CVDisplayLink?
        CVDisplayLinkCreateWithActiveCGDisplays(&dl)
        guard let dl else { return }

        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        CVDisplayLinkSetOutputCallback(dl, { _, inNow, _, _, _, ctx -> CVReturn in
            guard let ctx else { return kCVReturnError }
            let c = Unmanaged<NotchPanelController>.fromOpaque(ctx).takeUnretainedValue()
            let ts = Double(inNow.pointee.videoTime) / Double(inNow.pointee.videoTimeScale)
            DispatchQueue.main.async { c.displayLinkTick(timestamp: ts) }
            return kCVReturnSuccess
        }, selfPtr)

        displayLink = dl
        lastTimestamp = 0
        CVDisplayLinkStart(dl)
    }

    private func stopDisplayLink() {
        guard let dl = displayLink else { return }
        CVDisplayLinkStop(dl)
        displayLink = nil
        lastTimestamp = 0
    }

    private func displayLinkTick(timestamp: Double) {
        guard displayLink != nil else { return }  // Guard against stale dispatched ticks.
        defer { lastTimestamp = timestamp }
        guard lastTimestamp > 0 else { return }

        let dt = CGFloat(min(timestamp - lastTimestamp, 1.0 / 30.0))
        animator.advance(dt: dt)
        applyCurrentFrame()

        if animator.isSettled {
            stopDisplayLink()
        }
    }

    private func applyCurrentFrame() {
        guard let screen = panel.screen ?? NSScreen.adbBuddyHostScreen() else { return }

        let w = animator.width.position
        let h = animator.height.position
        let mx = animator.midX.position

        let newFrame = OverlayGeometry.panelFrame(
            midX: mx,
            screenMaxY: screen.frame.maxY,
            size: CGSize(width: w, height: h),
            screenMinX: screen.frame.minX,
            screenMaxX: screen.frame.maxX,
            horizontalMargin: screenMargin
        )

        panel.setFrame(newFrame, display: true)

        let expandRatio: CGFloat
        let cH = collapsedFrame.height
        let eH = expandedSize.height
        if eH > cH {
            expandRatio = max(0, min(1, (h - cH) / (eH - cH)))
        } else {
            expandRatio = 0
        }
        rootView.updateExpandRatio(expandRatio)
    }

    // MARK: - Event handling

    private func handle(localEvent event: NSEvent) -> NSEvent? {
        if event.type == .keyDown, event.keyCode == 53, store.isExpanded {
            store.dismissExpanded()
            return nil
        }
        guard store.isExpanded else { return event }
        guard event.type == .leftMouseDown || event.type == .rightMouseDown else { return event }
        if !panel.frame.contains(NSEvent.mouseLocation) {
            store.dismissExpanded()
        }
        return event
    }

    private func handleGlobalClick(_ event: NSEvent) {
        guard store.isExpanded else { return }
        if !panel.frame.contains(NSEvent.mouseLocation) {
            store.dismissExpanded()
        }
    }
}
