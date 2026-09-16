import CoreGraphics

enum OverlayGeometry {
    /// Frame for the single notch panel in screen coordinates (AppKit: origin = bottom-left).
    /// The panel's top edge is always flush with the screen top (screenMaxY).
    static func panelFrame(
        midX: CGFloat,
        screenMaxY: CGFloat,
        size: CGSize,
        screenMinX: CGFloat,
        screenMaxX: CGFloat,
        horizontalMargin: CGFloat = NotchStripLayoutConstants.horizontalScreenMargin
    ) -> CGRect {
        let x = max(screenMinX + horizontalMargin,
                    min(midX - size.width / 2, screenMaxX - size.width - horizontalMargin))
        let y = screenMaxY - size.height
        return CGRect(x: x, y: y, width: size.width, height: size.height)
    }
}
