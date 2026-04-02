# Notch Expansion Design
**Date:** 2026-04-02  
**Feature:** Notch-grows-down expansion — app content lives inside the notch itself

---

## Goal

Replace the current two-panel system (strip + floating overlay) with a single `NSPanel` whose frame spring-animates between a collapsed notch size and an expanded content size. Clicking the icon causes the notch to bounce open downward; clicking again or pressing Escape collapses it. The top edge stays pinned to the screen at all times.

---

## Architecture

### What changes

| Today | After |
|---|---|
| `OverlayController` manages two panels | `NotchPanelController` manages one panel |
| `NotchStripRootView` (strip chrome) | `NotchPanelRootView` (full chrome + content host) |
| `ExpandedOverlayPanel` (separate NSPanel) | Removed — content lives in the single panel |
| `OverlayGeometry` positions overlay below strip | `OverlayGeometry` anchors frame to screen top |

### Single panel states

- **Collapsed:** `width = notchStripWidth` (~324pt on notched displays), `height = menuBarThickness` (~38pt). Top edge = screen top.
- **Expanded:** `width = 420pt`, `height = 520pt`. Top edge = screen top. Horizontally centered on the notch midpoint.

### Files affected

- `OverlayController.swift` → replaced by `NotchPanelController.swift` (new file)
- `NotchStripChrome.swift` → `NotchStripRootView` becomes `NotchPanelRootView`
- `OverlayGeometry.swift` → frame computation anchors to screen top, not below strip
- `AppEntry.swift` → wire `NotchPanelController` instead of `OverlayController`
- `AppState.swift` → no structural changes

---

## Spring Physics

### `SpringAnimator` (new value type)

Holds two independent spring states: `width` and `height`. Each has `position`, `velocity`, and `target`.

Spring equation per tick:
```
acceleration = (stiffness × (target − position)) / mass − (damping × velocity)
velocity += acceleration × dt
position += velocity × dt
```

**Parameters:**
- `stiffness`: 280
- `damping`: 22
- `mass`: 1.0

These produce ~1 overshoot on expansion (notch bounces slightly past target, settles back) and a clean snap on collapse.

### `CVDisplayLink` ticker

Owned by `NotchPanelController`. Starts on expand/collapse trigger, stops when both springs are settled (both `|position − target| < 0.5` and `|velocity| < 0.5`).

Each tick:
1. Advance `SpringAnimator` for elapsed `dt`
2. Compute new panel frame: centered on notch `midX`, top = `screenFrame.maxY − currentHeight`, width = `currentWidth`, height = `currentHeight`
3. Call `panel.setFrame(_:display:)` — no CA animation, we drive it directly
4. `CAShapeLayer` mask path regenerates automatically in `NotchPanelRootView.layout()`

**x-position spring:** The panel's x also spring-animates so the notch expands symmetrically left and right from center. `SpringAnimator` holds a third spring state for `midX`. Collapsed target = notch strip midX. Expanded target = `screenFrame.midX` (screen center). The computed frame x = `midX − currentWidth / 2`, clamped to screen margins.

---

## `NotchPanelRootView`

Replaces `NotchStripRootView`. An `NSView` subclass with `wantsLayer = true`.

### Subviews

1. **`NotchStripIconClusterView`** — existing view, pinned to trailing-top corner at the same position as today. Always visible. Tap triggers `store.toggleExpanded()`.

2. **`NSHostingView<ExpandedOverlayView>`** — fills the panel below the icon strip area. Opacity controlled by `expandRatio` (see below).

### Shape mask

Same `CAShapeLayer` mask as current `NotchStripRootView.notchPath(in:)`:
- Flat top (flush with screen)
- Straight sides
- Concave bottom corners (quad-bezier, radius 10pt)

Regenerated every `layout()` call using the live `bounds` — so the shape correctly tracks the bouncing frame at 60fps.

### Hit testing

`hitTest(_:)` checks `expandRatio`:
- `expandRatio < 0.1`: only the icon hit rect (50×50pt, trailing) responds
- `expandRatio ≥ 0.1`: full visible mask area responds

---

## Content Reveal

```
expandRatio = (currentHeight − collapsedHeight) / (expandedHeight − collapsedHeight)  // clamped 0..1
```

- **Icon cluster opacity:** always 1.0 (stays fully visible throughout)
- **Content view opacity:** `max(0, (expandRatio − 0.6) / 0.4)` — fades in only during the last 40% of expansion, ensuring it never shows through the shrinking shape on collapse
- **On collapse trigger:** content opacity snaps to 0 immediately before the spring starts

---

## `NotchPanelController`

Replaces `OverlayController`. Responsibilities:

- Creates and owns the single `NSPanel` (borderless, non-activating, `.floating` level, `isOpaque = false`, `backgroundColor = .clear`, `hasShadow = false`)
- Owns `SpringAnimator` and `CVDisplayLink`
- Subscribes to `store.$isExpanded` → starts spring toward expanded or collapsed target
- Subscribes to `store.$panelLayout` → instantly snaps to new content size (no animation) if panel is already expanded
- Owns the local mouse/key monitor for dismiss-on-click-outside and Escape key (same logic as current `OverlayController`)
- On app launch: positions panel at collapsed notch frame, orders front

---

## `OverlayGeometry` Changes

Current `expandedOverlayFrame` positions the panel *above* the strip with a vertical gap. Replace with:

```swift
static func expandedFrame(notchMidX: CGFloat, screenMaxY: CGFloat, size: CGSize) -> CGRect {
    CGRect(
        x: notchMidX - size.width / 2,
        y: screenMaxY - size.height,   // top edge = screen top
        width: size.width,
        height: size.height
    )
}
```

Horizontal clamping (screen margin) stays the same.

---

## Dismissal

Unchanged from today:
- Local mouse monitor: click outside panel → `store.isExpanded = false`
- Local key monitor: Escape → `store.isExpanded = false`
- Close button in `ExpandedOverlayView` header → `store.isExpanded = false`

---

## What Does NOT Change

- `AppState` / `NotchAppState` — no structural changes
- `ExpandedOverlayView` and all child views (loading, pairing, connected, settings) — no changes
- `NotchStripIconClusterView` — no changes
- `NotchStripGeometry` / `NotchStripLayout` — used as-is to compute the collapsed frame
- `QRCodeRenderer`, `AppSettings` — untouched
