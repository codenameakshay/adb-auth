import AppKit
import XCTest
@testable import ADBBuddyNotchApp

@MainActor
final class NotchInteractionTests: XCTestCase {
    func testCollapsedRootHitTestRoutesToIconCluster() {
        let store = NotchAppState()
        let root = NotchPanelRootView(store: store, onTap: {})
        root.collapsedHeight = 38
        root.frame = CGRect(x: 0, y: 0, width: 324, height: 38)
        root.layout()

        let point = CGPoint(x: root.bounds.maxX - 20, y: root.bounds.maxY - 18)
        let hitView = root.hitTest(point)

        XCTAssertNotNil(hitView)
        if let hitView {
            XCTAssertEqual(String(describing: type(of: hitView)), "NotchStripIconClusterView")
        }
    }
}
