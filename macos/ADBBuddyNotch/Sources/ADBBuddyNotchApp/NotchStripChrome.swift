import AppKit

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

    /// Subviews (`NSImageView`, dot) would otherwise become the hit target; `mouseUp` would never reach this view.
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

/// Clickable only inside `iconContainer`; draws a menu-bar-height pill behind it.
final class NotchStripRootView: NSView {
    private let iconContainer: NSView

    init(iconContainer: NSView) {
        self.iconContainer = iconContainer
        super.init(frame: .zero)
        addSubview(iconContainer)
        wantsLayer = true
        layer?.backgroundColor = NSColor.black.cgColor
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layout() {
        super.layout()
        let h = bounds.height
        let w = bounds.width
        layer?.cornerRadius = min(w, h) / 2
    }

    override func hitTest(_ point: NSPoint) -> NSView? {
        guard let superview else { return nil }
        let pointInSelf = convert(point, from: superview)
        guard iconContainer.frame.contains(pointInSelf) else { return nil }
        // `hitTest` expects a point in the *receiver's superview* coords — same as our space (root), not icon-local.
        return iconContainer.hitTest(pointInSelf)
    }
}

@MainActor
enum NotchStripWindowFactory {
    static func makePanel(onTap: @escaping () -> Void) -> (
        panel: NSPanel,
        iconContainer: NSView,
        iconCluster: NotchStripIconClusterView
    ) {
        let iconCluster = NotchStripIconClusterView(onTap: onTap)
        let size = NotchStripLayoutConstants.iconHitSize
        iconCluster.setFrameSize(NSSize(width: size, height: size))

        let iconBox = NSView(frame: iconCluster.bounds)
        iconBox.addSubview(iconCluster)
        iconCluster.frame = iconBox.bounds
        iconCluster.autoresizingMask = [.width, .height]

        let root = NotchStripRootView(iconContainer: iconBox)

        let panel = NSPanel(
            contentRect: .zero,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isReleasedWhenClosed = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.ignoresMouseEvents = false

        panel.contentView = root
        root.frame = panel.contentLayoutRect
        root.autoresizingMask = [.width, .height]

        iconBox.autoresizingMask = []
        return (panel, iconBox, iconCluster)
    }

    static func syncIconCluster(
        iconContainer: NSView,
        iconCluster: NotchStripIconClusterView,
        iconFrameScreen: CGRect,
        panelFrameScreen: CGRect
    ) {
        let iconInWindow = iconFrameInWindow(iconFrameScreen: iconFrameScreen, panelFrameScreen: panelFrameScreen)
        iconContainer.frame = iconInWindow
        iconCluster.frame = iconContainer.bounds
    }

    private static func iconFrameInWindow(iconFrameScreen: CGRect, panelFrameScreen: CGRect) -> CGRect {
        CGRect(
            x: iconFrameScreen.minX - panelFrameScreen.minX,
            y: iconFrameScreen.minY - panelFrameScreen.minY,
            width: iconFrameScreen.width,
            height: iconFrameScreen.height
        )
    }
}
