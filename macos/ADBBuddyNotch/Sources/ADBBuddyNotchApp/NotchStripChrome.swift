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
