import CoreGraphics
import XCTest
@testable import ADBBuddyNotchApp

final class NotchMaskShapeTests: XCTestCase {
    func testCollapsedMaskCutsInBelowTopCorners() {
        let rect = CGRect(x: 0, y: 0, width: 324, height: 37)
        let path = NotchMaskShape.path(in: rect, expansionRatio: 0)

        XCTAssertTrue(path.contains(CGPoint(x: rect.midX, y: rect.maxY - 1)))
        XCTAssertFalse(path.contains(CGPoint(x: rect.minX + 2, y: rect.maxY - 12)))
        XCTAssertFalse(path.contains(CGPoint(x: rect.maxX - 2, y: rect.maxY - 12)))
    }

    func testExpandedMaskUsesLargerShoulders() {
        let rect = CGRect(x: 0, y: 0, width: 420, height: 520)
        let collapsed = NotchMaskShape.metrics(in: rect, expansionRatio: 0)
        let expanded = NotchMaskShape.metrics(in: rect, expansionRatio: 1)

        XCTAssertGreaterThan(expanded.shoulderRadius, collapsed.shoulderRadius)
        XCTAssertGreaterThan(expanded.bottomCornerRadius, collapsed.bottomCornerRadius)
        XCTAssertEqual(expanded.bodyMinX, expanded.shoulderRadius, accuracy: 0.001)
        XCTAssertEqual(expanded.bodyMaxX, rect.maxX - expanded.shoulderRadius, accuracy: 0.001)
    }

    func testMaskPathStillOccupiesFullPanelBounds() {
        let rect = CGRect(x: 0, y: 0, width: 420, height: 520)
        let path = NotchMaskShape.path(in: rect, expansionRatio: 1)

        XCTAssertEqual(path.boundingBoxOfPath.minX, rect.minX, accuracy: 0.001)
        XCTAssertEqual(path.boundingBoxOfPath.maxX, rect.maxX, accuracy: 0.001)
        XCTAssertEqual(path.boundingBoxOfPath.minY, rect.minY, accuracy: 0.001)
        XCTAssertEqual(path.boundingBoxOfPath.maxY, rect.maxY, accuracy: 0.001)
    }
}
