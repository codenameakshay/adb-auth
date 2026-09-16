import AppKit
import CoreGraphics

enum NotchStripLayoutConstants {
    /// Fixed inner width of the collapsed notch strip (see commit 3f40d71).
    static let notchInnerWidth: CGFloat = 220
    /// Non-notched displays: centered menu-bar pill (Dynamic Island–like proportion).
    static let centeredPillWidth: CGFloat = 148
    static let iconSymbolWidth: CGFloat = 21
    static let indicatorDotSize: CGFloat = 6
    static let indicatorGap: CGFloat = 4
    /// Collapsed notch width extends symmetrically on both sides by the visible icon cluster width.
    static let collapsedNotchSideContentWidth: CGFloat = iconSymbolWidth + indicatorDotSize + indicatorGap
    static let iconHitSize: CGFloat = 50
    static let iconTrailingPadding: CGFloat = 8
    static let horizontalScreenMargin: CGFloat = 8
    /// Never draw shorter than this; matches typical menu bar when API returns 0.
    static let minimumMenuBarThickness: CGFloat = 38
    /// Minimum pill height after insets.
    static let minimumStripHeight: CGFloat = 26
}

struct NotchStripScreenInputs {
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
        return (t, topY - t)
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
            let useAux = inputs.auxiliaryTopLeft.width > 0.5
                && inputs.auxiliaryTopRight.width > 0.5
                && (rightMin - leftMax) > 1
            width = min(
                NotchStripLayoutConstants.notchInnerWidth + 2 * NotchStripLayoutConstants.collapsedNotchSideContentWidth,
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
