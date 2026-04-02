import AppKit
import CoreGraphics

enum NotchStripLayoutConstants {
    /// Extra black beyond the camera housing on each side (notch mode).
    static let horizontalEarExtension: CGFloat = 42
    /// When auxiliary rects are missing but the display is notched.
    static let fallbackNotchInnerWidth: CGFloat = 240
    /// Non-notched displays: centered menu-bar pill (Dynamic Island–like proportion).
    static let centeredPillWidth: CGFloat = 148
    static let iconHitSize: CGFloat = 50
    static let iconTrailingPadding: CGFloat = 8
    static let horizontalScreenMargin: CGFloat = 8
    /// Never draw shorter than this; matches typical menu bar when API returns 0.
    static let minimumMenuBarThickness: CGFloat = 38
    /// Top/bottom inset inside the menu bar band. Zero = full menu bar height, flush with screen top (notch / island).
    static let stripVerticalInset: CGFloat = 0
    /// Minimum pill height after insets.
    static let minimumStripHeight: CGFloat = 26
}

struct NotchStripScreenInputs: Equatable {
    var screenFrame: CGRect
    /// Top safe area inset; greater than zero selects notch-aligned strip mode.
    var safeAreaTopInset: CGFloat
    var auxiliaryTopLeft: CGRect
    var auxiliaryTopRight: CGRect
    var menuBarThickness: CGFloat
}

enum NotchStripLayout {
    /// Pill height and origin Y.
    /// - Notched displays: use the top safe-area height and keep the strip flush with the screen top.
    /// - Other displays: vertically center the pill in the menu bar band `[topY - thickness, topY]`.
    private static func stripHeightAndOriginY(
        topY: CGFloat,
        menuBarThickness: CGFloat,
        safeAreaTopInset: CGFloat,
        hasNotch: Bool
    ) -> (height: CGFloat, y: CGFloat) {
        if hasNotch {
            let h = max(NotchStripLayoutConstants.minimumStripHeight, safeAreaTopInset)
            return (h, topY - h)
        }

        let t = menuBarThickness
        let inset = NotchStripLayoutConstants.stripVerticalInset
        var h = t - 2 * inset
        if h < NotchStripLayoutConstants.minimumStripHeight {
            h = min(NotchStripLayoutConstants.minimumStripHeight, t)
        }
        let y = topY - t + (t - h) / 2
        return (h, y)
    }

    /// Full strip frame in screen coordinates (AppKit space, origin bottom-left).
    static func stripFrame(inputs: NotchStripScreenInputs) -> CGRect {
        let topY = inputs.screenFrame.maxY
        let thickness = inputs.menuBarThickness
        let hasNotch = inputs.safeAreaTopInset > 0
        let (stripH, y) = stripHeightAndOriginY(
            topY: topY,
            menuBarThickness: thickness,
            safeAreaTopInset: inputs.safeAreaTopInset,
            hasNotch: hasNotch
        )
        let margin = NotchStripLayoutConstants.horizontalScreenMargin

        let width: CGFloat
        let midX: CGFloat

        if hasNotch {
            let leftMax = inputs.auxiliaryTopLeft.maxX
            let rightMin = inputs.auxiliaryTopRight.minX
            let inner = rightMin - leftMax
            let useAux = inputs.auxiliaryTopLeft.width > 0.5
                && inputs.auxiliaryTopRight.width > 0.5
                && inner > 1
            let effectiveInner = useAux ? inner : NotchStripLayoutConstants.fallbackNotchInnerWidth
            width = min(
                effectiveInner + 2 * NotchStripLayoutConstants.horizontalEarExtension,
                inputs.screenFrame.width - 2 * margin
            )
            midX = useAux ? (leftMax + rightMin) / 2 : inputs.screenFrame.midX
        } else {
            width = min(
                NotchStripLayoutConstants.centeredPillWidth,
                inputs.screenFrame.width - 2 * margin
            )
            midX = inputs.screenFrame.midX
        }

        var x = midX - width / 2
        x = min(max(x, inputs.screenFrame.minX + margin), inputs.screenFrame.maxX - width - margin)

        return CGRect(x: x, y: y, width: width, height: stripH)
    }

    /// Hit target for the icon on the trailing side of the strip.
    static func iconHitFrame(stripFrame: CGRect) -> CGRect {
        let maxSide = max(stripFrame.height - 6, 24)
        let s = min(NotchStripLayoutConstants.iconHitSize, maxSide)
        let pad = NotchStripLayoutConstants.iconTrailingPadding
        return CGRect(
            x: stripFrame.maxX - pad - s,
            y: stripFrame.minY + (stripFrame.height - s) / 2,
            width: s,
            height: s
        )
    }
}

extension NSScreen {
    /// Prefer the built-in notched screen; otherwise the main screen.
    static func adbBuddyHostScreen() -> NSScreen? {
        if let notched = NSScreen.screens.first(where: { $0.safeAreaInsets.top > 0 }) {
            return notched
        }
        return NSScreen.main ?? NSScreen.screens.first
    }

    func adbBuddyStripInputs(menuBarThickness: CGFloat) -> NotchStripScreenInputs {
        NotchStripScreenInputs(
            screenFrame: frame,
            safeAreaTopInset: safeAreaInsets.top,
            auxiliaryTopLeft: auxiliaryTopLeftArea ?? .zero,
            auxiliaryTopRight: auxiliaryTopRightArea ?? .zero,
            menuBarThickness: menuBarThickness
        )
    }
}
