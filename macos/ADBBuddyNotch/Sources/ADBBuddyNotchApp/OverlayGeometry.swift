import CoreGraphics

enum OverlayLayout {
    static let expandedSurface = CGSize(width: 420, height: 520)
}

enum OverlayGeometry {
    static func expandedOverlayFrame(
        anchorFrame: CGRect,
        screenFrame: CGRect
    ) -> CGRect {
        let size = OverlayLayout.expandedSurface
        let horizontalMargin: CGFloat = 12
        let preferredX = anchorFrame.midX - size.width / 2
        let maxX = screenFrame.maxX - size.width - horizontalMargin
        let minX = screenFrame.minX + horizontalMargin
        let x = min(max(preferredX, minX), maxX)
        let y = max(screenFrame.minY + 12, anchorFrame.minY - size.height - 10)

        return CGRect(x: x, y: y, width: size.width, height: size.height)
    }
}
