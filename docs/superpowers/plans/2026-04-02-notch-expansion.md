# Notch Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-panel strip+overlay system with a single `NSPanel` whose frame spring-animates downward from the notch when clicked, making the app feel like it lives in the notch.

**Architecture:** A new `NotchPanelController` owns one `NSPanel` containing `NotchPanelRootView`. A `SpringAnimator` value type tracks three spring states (width, height, midX). A `CVDisplayLink` drives frame updates at display refresh rate. The `CAShapeLayer` mask regenerates every `layout()` call, so the notch shape tracks the bouncing frame automatically.

**Tech Stack:** Swift, AppKit, CoreVideo (CVDisplayLink), SwiftUI (NSHostingView), Combine

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/SpringAnimator.swift` | **Create** | Spring physics value type (3 states: width, height, midX) |
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayGeometry.swift` | **Modify** | Replace `expandedOverlayFrame` with `panelFrame` anchored at screen top |
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchStripChrome.swift` | **Modify** | Replace `NotchStripRootView` + `NotchStripWindowFactory` with `NotchPanelRootView` |
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchPanelController.swift` | **Create** | Replaces `OverlayController` — owns panel, spring animator, display link |
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/AppEntry.swift` | **Modify** | Wire `NotchPanelController` instead of `OverlayController` |
| `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayController.swift` | **Delete** | Replaced by `NotchPanelController` |

---

## Task 1: SpringAnimator value type

**Files:**
- Create: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/SpringAnimator.swift`

- [ ] **Step 1: Create the file**

```swift
import CoreGraphics

/// A single damped-spring state for one scalar value.
struct SpringState {
    var position: CGFloat
    var velocity: CGFloat = 0
    var target: CGFloat

    mutating func advance(dt: CGFloat, stiffness: CGFloat, damping: CGFloat, mass: CGFloat) {
        let acceleration = (stiffness * (target - position)) / mass - (damping * velocity)
        velocity += acceleration * dt
        position += velocity * dt
    }

    var isSettled: Bool {
        abs(position - target) < 0.5 && abs(velocity) < 0.5
    }
}

/// Three independent spring states (width, height, midX) for the notch panel frame.
struct SpringAnimator {
    var width: SpringState
    var height: SpringState
    var midX: SpringState

    // Tuned for Dynamic Island-like bounce: slight overshoot, quick settle.
    let stiffness: CGFloat = 280
    let damping: CGFloat = 22
    let mass: CGFloat = 1.0

    mutating func advance(dt: CGFloat) {
        width.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
        height.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
        midX.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
    }

    var isSettled: Bool {
        width.isSettled && height.isSettled && midX.isSettled
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

In Xcode: ⌘B or run:
```bash
cd macos/ADBBuddyNotch && swift build 2>&1 | grep -E "error:|warning:|Build complete"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/SpringAnimator.swift
git commit -m "feat: add SpringAnimator value type for spring physics"
```

---

## Task 2: Update OverlayGeometry to anchor at screen top

**Files:**
- Modify: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayGeometry.swift`

- [ ] **Step 1: Replace the file contents**

The current file has `OverlayLayout` and `expandedOverlayFrame(anchorFrame:screenFrame:)`. Replace with:

```swift
import CoreGraphics

enum OverlayLayout {
    static let expandedSurface = CGSize(width: 420, height: 520)
}

enum OverlayGeometry {
    /// Frame for the single notch panel in screen coordinates (AppKit: origin = bottom-left).
    /// The panel's top edge is always flush with the screen top (screenMaxY).
    static func panelFrame(
        midX: CGFloat,
        screenMaxY: CGFloat,
        size: CGSize,
        screenMinX: CGFloat,
        screenMaxX: CGFloat,
        horizontalMargin: CGFloat = 8
    ) -> CGRect {
        let x = max(screenMinX + horizontalMargin,
                    min(midX - size.width / 2, screenMaxX - size.width - horizontalMargin))
        let y = screenMaxY - size.height
        return CGRect(x: x, y: y, width: size.width, height: size.height)
    }
}
```

- [ ] **Step 2: Build to verify**

```bash
cd macos/ADBBuddyNotch && swift build 2>&1 | grep -E "error:|Build complete"
```

Expected: errors about `expandedOverlayFrame` being missing — that's fine, the caller (`OverlayController`) will be deleted in Task 5. If you see errors only in `OverlayController.swift`, proceed.

- [ ] **Step 3: Commit**

```bash
git add macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayGeometry.swift
git commit -m "feat: update OverlayGeometry to anchor panel at screen top"
```

---

## Task 3: Replace NotchStripChrome with NotchPanelRootView

**Files:**
- Modify: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchStripChrome.swift`

The current file has `NotchStripIconClusterView`, `NotchStripRootView`, and `NotchStripWindowFactory`. Keep `NotchStripIconClusterView` unchanged, replace the rest.

- [ ] **Step 1: Replace the entire file**

```swift
import AppKit
import SwiftUI

/// AppKit-only strip control (no SwiftUI `NSHostingView`) so init cannot crash before a window exists.
@MainActor
final class NotchStripIconClusterView: NSView {
    var onTap: () -> Void
    private let imageView = NSImageView()
    private let dotView = NSView()

    init(onTap: @escaping () -> Void) {
        self.onTap = onTap
        super.init(frame: .zero)
        wantsLayer = false
        toolTip = "ADB Buddy"

        let symbolConfig = NSImage.SymbolConfiguration(pointSize: 15, weight: .semibold)
        let symbol = NSImage(
            systemSymbolName: "iphone.gen3.radiowaves.left.and.right",
            accessibilityDescription: "ADB Buddy"
        )?.withSymbolConfiguration(symbolConfig)
        imageView.image = symbol
        imageView.imageScaling = .scaleProportionallyDown
        imageView.contentTintColor = .white

        dotView.wantsLayer = true
        dotView.layer?.cornerRadius = 4
        dotView.layer?.backgroundColor = NSColor.systemYellow.cgColor

        addSubview(imageView)
        addSubview(dotView)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func sync(from store: NotchAppState) {
        dotView.layer?.backgroundColor = Self.dotColor(for: store).cgColor
    }

    private static func dotColor(for store: NotchAppState) -> NSColor {
        switch store.viewMode {
        case .loading:
            return .systemYellow
        case .adbMissing:
            return .systemRed
        case .pairing:
            switch store.pairingProgress.stage {
            case .error:
                return .systemRed
            case .success:
                return .systemGreen
            default:
                return .systemBlue
            }
        case .connected:
            return .systemGreen
        }
    }

    override func layout() {
        super.layout()
        let iconSide: CGFloat = 21
        let dotSize: CGFloat = 8
        let gap: CGFloat = 5
        let totalWidth = iconSide + gap + dotSize
        let originX = (bounds.width - totalWidth) / 2
        let midY = (bounds.height - iconSide) / 2
        imageView.frame = CGRect(x: originX, y: midY, width: iconSide, height: iconSide)
        dotView.frame = CGRect(
            x: imageView.frame.maxX + gap,
            y: (bounds.height - dotSize) / 2,
            width: dotSize,
            height: dotSize
        )
    }

    override func hitTest(_ point: NSPoint) -> NSView? {
        guard let superview else { return nil }
        let local = convert(point, from: superview)
        guard bounds.contains(local) else { return nil }
        return self
    }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseUp(with event: NSEvent) {
        if bounds.contains(convert(event.locationInWindow, from: nil)) {
            onTap()
        }
        super.mouseUp(with: event)
    }
}

/// The single root view for the notch panel.
/// Hosts the icon cluster (always at trailing-top) and the expanded content view.
/// The CAShapeLayer mask gives the panel its notch shape — regenerated every layout() call
/// so it tracks the spring-animated frame at display refresh rate.
@MainActor
final class NotchPanelRootView: NSView {
    let iconCluster: NotchStripIconClusterView
    private let iconBox: NSView
    private let contentHostingView: NSHostingView<ExpandedOverlayView>
    private let shapeMask = CAShapeLayer()

    /// Set by the controller from NotchStripLayout so expandRatio can be computed.
    var collapsedHeight: CGFloat = NotchStripLayoutConstants.minimumMenuBarThickness
    /// Matches OverlayLayout.expandedSurface.height.
    let expandedHeight: CGFloat = OverlayLayout.expandedSurface.height

    init(store: NotchAppState, onTap: @escaping () -> Void) {
        iconCluster = NotchStripIconClusterView(onTap: onTap)
        let iconSize = NotchStripLayoutConstants.iconHitSize
        iconBox = NSView(frame: CGRect(origin: .zero, size: CGSize(width: iconSize, height: iconSize)))
        iconBox.addSubview(iconCluster)
        iconCluster.frame = iconBox.bounds
        iconCluster.autoresizingMask = [.width, .height]

        contentHostingView = NSHostingView(rootView: ExpandedOverlayView(store: store))
        contentHostingView.alphaValue = 0

        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = NSColor.black.cgColor
        layer?.mask = shapeMask

        // Content below icon cluster in z-order; icon on top.
        addSubview(contentHostingView)
        addSubview(iconBox)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func refreshContent(store: NotchAppState) {
        contentHostingView.rootView = ExpandedOverlayView(store: store)
    }

    /// Called every display-link tick by the controller.
    func updateExpandRatio(_ ratio: CGFloat) {
        // Icon cluster: full opacity when collapsed, fades out as content appears.
        iconBox.alphaValue = max(0, 1.0 - ratio * 3.0)

        // Content: fades in only in the last 40% of expansion.
        contentHostingView.alphaValue = max(0, (ratio - 0.6) / 0.4)
    }

    /// Snap content to hidden immediately (called before collapse spring starts).
    func snapToCollapsed() {
        contentHostingView.alphaValue = 0
        iconBox.alphaValue = 1
    }

    override func layout() {
        super.layout()
        shapeMask.frame = bounds
        shapeMask.path = notchPath(in: bounds)

        // Content fills full panel bounds — clipped by the mask.
        contentHostingView.frame = bounds

        // Icon box: trailing-top corner.
        let pad = NotchStripLayoutConstants.iconTrailingPadding
        let iconSize = NotchStripLayoutConstants.iconHitSize
        let iconW = min(iconSize, bounds.width)
        let iconH = min(iconSize, bounds.height)
        // AppKit: y=0 is bottom, y=maxY is top.
        iconBox.frame = CGRect(
            x: bounds.maxX - pad - iconW,
            y: bounds.maxY - iconH,
            width: iconW,
            height: iconH
        )
    }

    override func hitTest(_ point: NSPoint) -> NSView? {
        guard let superview else { return nil }
        let local = convert(point, from: superview)

        let expandRatio: CGFloat
        if collapsedHeight >= expandedHeight {
            expandRatio = 0
        } else {
            expandRatio = max(0, min(1, (bounds.height - collapsedHeight) / (expandedHeight - collapsedHeight)))
        }

        if expandRatio < 0.1 {
            // Collapsed: only icon box responds.
            guard iconBox.frame.contains(local) else { return nil }
            return iconCluster.hitTest(local)
        }

        // Expanded: full visible mask area responds.
        guard bounds.contains(local) else { return nil }
        return super.hitTest(point)
    }

    // MARK: - Notch shape

    /// Mac-style notch path: flat top, straight sides, concave bottom corners.
    /// AppKit coords — origin is bottom-left, so y=bounds.height is the screen top (flat/hidden).
    private func notchPath(in rect: CGRect) -> CGPath {
        let w = rect.width
        let h = rect.height
        let r: CGFloat = 10

        let path = CGMutablePath()
        path.move(to: CGPoint(x: 0, y: h))
        path.addLine(to: CGPoint(x: w, y: h))
        path.addLine(to: CGPoint(x: w, y: r))
        path.addQuadCurve(to: CGPoint(x: w - r, y: 0), control: CGPoint(x: w, y: 0))
        path.addLine(to: CGPoint(x: r, y: 0))
        path.addQuadCurve(to: CGPoint(x: 0, y: r), control: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: 0, y: h))
        path.closeSubpath()
        return path
    }
}
```

- [ ] **Step 2: Build**

```bash
cd macos/ADBBuddyNotch && swift build 2>&1 | grep -E "error:|Build complete"
```

Expected: errors only in `OverlayController.swift` (references `NotchStripWindowFactory` / `NotchStripRootView` which are gone). That file is deleted in Task 5.

- [ ] **Step 3: Commit**

```bash
git add macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchStripChrome.swift
git commit -m "feat: replace NotchStripRootView with NotchPanelRootView"
```

---

## Task 4: Create NotchPanelController

**Files:**
- Create: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchPanelController.swift`

- [ ] **Step 1: Create the file**

```swift
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
                // Content size changed while expanded — update content, no frame change needed
                // since expanded size is fixed at OverlayLayout.expandedSurface.
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
```

- [ ] **Step 2: Build**

```bash
cd macos/ADBBuddyNotch && swift build 2>&1 | grep -E "error:|Build complete"
```

Expected: errors only in `OverlayController.swift` and `AppEntry.swift` (old types). Those are fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/NotchPanelController.swift
git commit -m "feat: add NotchPanelController with CVDisplayLink spring animation"
```

---

## Task 5: Wire up AppEntry and delete OverlayController

**Files:**
- Modify: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/AppEntry.swift`
- Delete: `macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayController.swift`

- [ ] **Step 1: Replace AppEntry.swift**

```swift
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
    private var panelController: NotchPanelController?
    private let store = NotchAppState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = NSApp.setActivationPolicy(.accessory)
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.panelController = NotchPanelController(store: self.store)
            self.panelController?.launch()
            self.store.launch()
        }
    }
}
```

- [ ] **Step 2: Delete OverlayController.swift**

```bash
rm macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayController.swift
```

- [ ] **Step 3: Build — must be clean**

```bash
cd macos/ADBBuddyNotch && swift build 2>&1 | grep -E "error:|Build complete"
```

Expected: `Build complete!` with no errors.

- [ ] **Step 4: Run the app and verify**

Open the project in Xcode and run on your Mac. Verify:
- [ ] Notch strip appears at the top of the screen in the notch area
- [ ] Clicking the phone icon causes the notch to spring open downward
- [ ] The notch bounces slightly past the target size, then settles
- [ ] Content (loading/pairing/connected view) fades in as the notch expands
- [ ] Clicking outside collapses it with a spring back to notch size
- [ ] Pressing Escape collapses it
- [ ] The notch shape (flat top, concave bottom corners) is maintained throughout the animation
- [ ] On screen changes (external monitor plug/unplug), the strip repositions correctly

- [ ] **Step 5: Commit**

```bash
git add macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/AppEntry.swift
git rm macos/ADBBuddyNotch/Sources/ADBBuddyNotchApp/OverlayController.swift
git commit -m "feat: wire NotchPanelController, remove two-panel OverlayController"
```
