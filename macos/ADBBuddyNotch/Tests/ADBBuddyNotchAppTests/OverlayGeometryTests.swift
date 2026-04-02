import CoreGraphics
import XCTest
@testable import ADBBuddyNotchApp

final class OverlayGeometryTests: XCTestCase {

    func testCollapsedHeightIsClampedToHardwareNotchFloor() {
        let clamped = OverlayGeometry.clampedPanelHeight(
            24,
            isExpanded: false,
            collapsedHeight: 32
        )

        XCTAssertEqual(clamped, 32, accuracy: 0.001)
    }
    func testPanelFrameUsesStableSizeAndPinsTopEdgeToScreen() {
        let screenFrame = CGRect(x: 0, y: 0, width: 1512, height: 982)
        let size = OverlayLayout.expandedSurface

        let frame = OverlayGeometry.panelFrame(
            midX: screenFrame.midX,
            screenMaxY: screenFrame.maxY,
            size: size,
            screenMinX: screenFrame.minX,
            screenMaxX: screenFrame.maxX
        )

        XCTAssertEqual(frame.size.width, size.width, accuracy: 0.001)
        XCTAssertEqual(frame.size.height, size.height, accuracy: 0.001)
        XCTAssertEqual(frame.maxY, screenFrame.maxY, accuracy: 0.001)
        XCTAssertEqual(frame.midX, screenFrame.midX, accuracy: 0.001)
    }
}
