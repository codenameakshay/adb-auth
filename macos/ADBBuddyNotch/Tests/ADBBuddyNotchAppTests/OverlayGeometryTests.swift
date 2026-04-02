import CoreGraphics
import XCTest
@testable import ADBBuddyNotchApp

final class OverlayGeometryTests: XCTestCase {
    func testExpandedOverlayUsesStableSizeAndSitsBelowCollapsedAnchor() {
        let anchor = CGRect(x: 1600, y: 1086, width: 28, height: 24)
        let screenFrame = CGRect(x: 0, y: 0, width: 1512, height: 982)

        let frame = OverlayGeometry.expandedOverlayFrame(
            anchorFrame: anchor,
            screenFrame: screenFrame
        )

        XCTAssertEqual(frame.size.width, OverlayLayout.expandedSurface.width, accuracy: 0.001)
        XCTAssertEqual(frame.size.height, OverlayLayout.expandedSurface.height, accuracy: 0.001)
        XCTAssertLessThan(frame.maxY, anchor.minY)
    }
}
