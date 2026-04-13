import CoreGraphics

enum OverlayLayout {
    static let expandedSurface = CGSize(width: 350, height: 430)
}

enum OverlayGeometry {
    static func maskedBodyWidth(for size: CGSize) -> CGFloat {
        let rect = CGRect(origin: .zero, size: size)
        let metrics = NotchMaskShape.metrics(in: rect, expansionRatio: 1)
        return metrics.bodyMaxX - metrics.bodyMinX
    }

    static func clampedPanelHeight(
        _ height: CGFloat,
        isExpanded: Bool,
        collapsedHeight: CGFloat
    ) -> CGFloat {
        guard !isExpanded else { return height }
        return max(height, collapsedHeight)
    }

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
