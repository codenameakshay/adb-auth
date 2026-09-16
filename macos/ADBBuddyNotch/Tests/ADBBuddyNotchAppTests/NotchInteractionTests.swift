import AppKit
import XCTest
@testable import ADBBuddyNotchApp

@MainActor
final class NotchInteractionTests: XCTestCase {

    func testCollapsedIconImageLoadsFromBundledAndroidAsset() {
        let image = NotchStripIconClusterView.collapsedIconImage()

        XCTAssertNotNil(image)
    }

    func testCollapsedRootHitTestRoutesToIconCluster() {
        let store = NotchAppState()
        let root = NotchPanelRootView(store: store, onTap: {})
        root.collapsedHeight = 38
        root.frame = CGRect(x: 0, y: 0, width: 324, height: 38)
        root.layout()

        let point = CGPoint(x: root.bounds.maxX - 20, y: root.bounds.maxY - 18)
        let hitView = root.hitTest(point)

        XCTAssertTrue(hitView === root.iconCluster)
    }

    func testLayoutFadesIconOutAtFullExpansion() {
        let store = NotchAppState()
        let root = NotchPanelRootView(store: store, onTap: {})
        root.collapsedHeight = 38
        root.expandedHeight = 430
        let iconBox = root.iconCluster.superview

        root.frame = CGRect(x: 0, y: 0, width: 324, height: 38)
        root.layout()
        XCTAssertEqual(iconBox?.alphaValue ?? -1, 1, accuracy: 0.001)

        root.frame = CGRect(x: 0, y: 0, width: 350, height: 430)
        root.layout()
        XCTAssertEqual(iconBox?.alphaValue ?? -1, 0, accuracy: 0.001)
    }
}
