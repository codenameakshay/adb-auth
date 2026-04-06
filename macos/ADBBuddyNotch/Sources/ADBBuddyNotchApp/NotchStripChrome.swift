import AppKit
import SwiftUI

enum NotchMaskShape {
    struct Metrics {
        let shoulderRadius: CGFloat
        let bottomCornerRadius: CGFloat
        let bodyMinX: CGFloat
        let bodyMaxX: CGFloat
        let bodyTopY: CGFloat
    }

    static func path(in rect: CGRect, expansionRatio: CGFloat) -> CGPath {
        guard rect.width > 0, rect.height > 0 else {
            return CGMutablePath()
        }

        let metrics = metrics(in: rect, expansionRatio: expansionRatio)
        let path = CGMutablePath()

        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addArc(
            tangent1End: CGPoint(x: metrics.bodyMaxX, y: rect.maxY),
            tangent2End: CGPoint(x: metrics.bodyMaxX, y: metrics.bodyTopY),
            radius: metrics.shoulderRadius
        )
        path.addLine(to: CGPoint(x: metrics.bodyMaxX, y: rect.minY + metrics.bottomCornerRadius))
        path.addArc(
            tangent1End: CGPoint(x: metrics.bodyMaxX, y: rect.minY),
            tangent2End: CGPoint(x: metrics.bodyMaxX - metrics.bottomCornerRadius, y: rect.minY),
            radius: metrics.bottomCornerRadius
        )
        path.addLine(to: CGPoint(x: metrics.bodyMinX + metrics.bottomCornerRadius, y: rect.minY))
        path.addArc(
            tangent1End: CGPoint(x: metrics.bodyMinX, y: rect.minY),
            tangent2End: CGPoint(x: metrics.bodyMinX, y: rect.minY + metrics.bottomCornerRadius),
            radius: metrics.bottomCornerRadius
        )
        path.addLine(to: CGPoint(x: metrics.bodyMinX, y: metrics.bodyTopY))
        path.addArc(
            tangent1End: CGPoint(x: metrics.bodyMinX, y: rect.maxY),
            tangent2End: CGPoint(x: rect.minX, y: rect.maxY),
            radius: metrics.shoulderRadius
        )
        path.closeSubpath()

        return path
    }

    static func metrics(in rect: CGRect, expansionRatio: CGFloat) -> Metrics {
        let ratio = max(0, min(1, expansionRatio))
        let desiredRadius = lerp(from: 8, to: 32, ratio: ratio)
        let maxShoulderRadius = max(0, min(rect.height * 0.45, rect.width / 2 - 1))
        let shoulderRadius = min(desiredRadius, maxShoulderRadius)

        let bodyMinX = rect.minX + shoulderRadius
        let bodyMaxX = rect.maxX - shoulderRadius
        let bodyTopY = rect.maxY - shoulderRadius

        let bottomCornerRadius = max(
            0,
            min(
                desiredRadius,
                rect.height,
                max(0, (bodyMaxX - bodyMinX) / 2)
            )
        )

        return Metrics(
            shoulderRadius: shoulderRadius,
            bottomCornerRadius: bottomCornerRadius,
            bodyMinX: bodyMinX,
            bodyMaxX: bodyMaxX,
            bodyTopY: bodyTopY
        )
    }

    private static func lerp(from start: CGFloat, to end: CGFloat, ratio: CGFloat) -> CGFloat {
        start + (end - start) * ratio
    }
}

/// AppKit-only strip control (no SwiftUI `NSHostingView`) so init cannot crash before a window exists.
@MainActor
final class NotchStripIconClusterView: NSView {
    var onTap: () -> Void
    private let imageView = NSImageView()
    private let dotView = NSView()

    static func collapsedIconImage() -> NSImage? {
        guard let url = Bundle.module.url(forResource: "android", withExtension: "png"),
              let image = NSImage(contentsOf: url) else {
            return nil
        }
        image.isTemplate = false
        return image
    }

    init(onTap: @escaping () -> Void) {
        self.onTap = onTap
        super.init(frame: .zero)
        wantsLayer = false
        toolTip = "ADB Buddy"

        imageView.image = Self.collapsedIconImage()
        imageView.imageScaling = .scaleProportionallyDown

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
        let iconSide = NotchStripLayoutConstants.iconSymbolWidth
        let dotSize = NotchStripLayoutConstants.indicatorDotSize
        let gap = NotchStripLayoutConstants.indicatorGap
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
        guard bounds.contains(point) else { return nil }
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
    /// Updated by the controller whenever panelLayout changes.
    var expandedHeight: CGFloat = OverlayLayout.expandedSurface.height

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
        shapeMask.path = NotchMaskShape.path(in: bounds, expansionRatio: currentExpandRatio)

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
        if currentExpandRatio < 0.1 {
            // Collapsed: only icon box responds.
            guard iconBox.frame.contains(point) else { return nil }
            return iconCluster.hitTest(iconCluster.convert(point, from: self))
        }

        // Expanded: full visible mask area responds.
        guard bounds.contains(point) else { return nil }
        return super.hitTest(point)
    }

    private var currentExpandRatio: CGFloat {
        guard expandedHeight > collapsedHeight else { return 0 }
        return max(0, min(1, (bounds.height - collapsedHeight) / (expandedHeight - collapsedHeight)))
    }
}
