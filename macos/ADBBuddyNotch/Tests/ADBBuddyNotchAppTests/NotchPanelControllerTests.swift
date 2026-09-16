import AppKit
import XCTest
@testable import ADBBuddyNotchApp

@MainActor
final class NotchPanelControllerTests: XCTestCase {

    /// The display link must drive the spring all the way to the expanded size and back.
    func testDisplayLinkDrivesExpandAndCollapse() {
        let store = NotchAppState()
        let controller = NotchPanelController(store: store)
        controller.launch()

        XCTAssertTrue(wait(timeout: 1) { controller.panel.frame.height > 0 })
        let collapsedHeight = controller.panel.frame.height

        store.isExpanded = true

        // `isExpanded`'s didSet kicks off an async refresh that can move `store.viewMode`
        // (and therefore the target panel size) after expansion starts, so re-read the
        // expected size live on every poll rather than freezing it up front.
        let expandedReached = wait(timeout: 3) {
            let size = store.viewMode.panelSize
            return abs(controller.panel.frame.width - size.width) < 1
                && abs(controller.panel.frame.height - size.height) < 1
        }
        let expandedSize = store.viewMode.panelSize
        XCTAssertTrue(
            expandedReached,
            "panel frame never reached expanded size \(expandedSize); last frame \(controller.panel.frame)"
        )

        store.dismissExpanded()

        XCTAssertTrue(
            wait(timeout: 3) { abs(controller.panel.frame.height - collapsedHeight) < 1 },
            "panel never collapsed back to \(collapsedHeight); last frame \(controller.panel.frame)"
        )
    }

    /// Spins the main run loop (where the display link ticks) until `condition` holds or time runs out.
    private func wait(timeout: TimeInterval, condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            if Date() >= deadline { return condition() }
            RunLoop.main.run(until: Date().addingTimeInterval(0.02))
        }
        return true
    }
}
