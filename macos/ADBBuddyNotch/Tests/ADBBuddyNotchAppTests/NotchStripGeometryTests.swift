import CoreGraphics
import XCTest
@testable import ADBBuddyNotchApp

final class NotchStripGeometryTests: XCTestCase {
    func testCenteredPillIsHorizontallyCenteredAndSpansMenuBarHeight() {
        let screen = CGRect(x: 0, y: 0, width: 1512, height: 982)
        let thickness: CGFloat = 37
        let inputs = NotchStripScreenInputs(
            screenFrame: screen,
            safeAreaTopInset: 0,
            auxiliaryTopLeft: .zero,
            auxiliaryTopRight: .zero,
            menuBarThickness: thickness
        )

        let strip = NotchStripLayout.stripFrame(inputs: inputs)
        let topY = screen.maxY
        let expectedH = thickness

        XCTAssertEqual(strip.width, NotchStripLayoutConstants.centeredPillWidth, accuracy: 0.001)
        XCTAssertEqual(strip.height, expectedH, accuracy: 0.001)
        XCTAssertEqual(strip.midX, screen.midX, accuracy: 0.001)
        XCTAssertEqual(strip.midY, topY - thickness / 2, accuracy: 0.001)
    }

    func testNotchModeUsesAuxiliaryRectsAndSafeAreaHeight() {
        let screen = CGRect(x: 0, y: 0, width: 1512, height: 982)
        let thickness: CGFloat = 37
        let safeAreaTopInset: CGFloat = 32
        let auxLeft = CGRect(x: 0, y: screen.maxY - thickness, width: 600, height: thickness)
        let auxRight = CGRect(x: 912, y: screen.maxY - thickness, width: 600, height: thickness)
        let inputs = NotchStripScreenInputs(
            screenFrame: screen,
            safeAreaTopInset: safeAreaTopInset,
            auxiliaryTopLeft: auxLeft,
            auxiliaryTopRight: auxRight,
            menuBarThickness: thickness
        )

        let strip = NotchStripLayout.stripFrame(inputs: inputs)
        let inner = auxRight.minX - auxLeft.maxX
        let expectedWidth = inner + 2 * NotchStripLayoutConstants.collapsedNotchSideContentWidth

        XCTAssertEqual(strip.width, expectedWidth, accuracy: 0.001)
        XCTAssertEqual(strip.midX, (auxLeft.maxX + auxRight.minX) / 2, accuracy: 0.001)
        XCTAssertEqual(strip.height, safeAreaTopInset, accuracy: 0.001)
        XCTAssertEqual(strip.maxY, screen.maxY, accuracy: 0.001)
    }

    func testIconHitFrameIsTrailingInsideStrip() {
        let strip = CGRect(x: 100, y: 900, width: 200, height: 37)
        let icon = NotchStripLayout.iconHitFrame(stripFrame: strip)

        XCTAssertLessThanOrEqual(icon.maxX, strip.maxX - NotchStripLayoutConstants.iconTrailingPadding + 0.001)
        XCTAssertGreaterThanOrEqual(icon.minX, strip.minX)
        XCTAssertEqual(icon.midY, strip.midY, accuracy: 0.001)
    }
}
