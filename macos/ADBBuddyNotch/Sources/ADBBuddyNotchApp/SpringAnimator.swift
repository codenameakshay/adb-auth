import CoreGraphics

/// A single damped-spring state for one scalar value.
struct SpringState {
    var position: CGFloat
    var velocity: CGFloat = 0
    var target: CGFloat

    mutating func advance(dt: CGFloat, stiffness: CGFloat, damping: CGFloat, mass: CGFloat) {
        let acceleration = (stiffness * (target - position)) / mass - (damping * velocity)
        velocity += acceleration * dt
        position += velocity * dt
    }

    var isSettled: Bool {
        abs(position - target) < 0.5 && abs(velocity) < 0.5
    }
}

/// Three independent spring states (width, height, midX) for the notch panel frame.
struct SpringAnimator {
    var width: SpringState
    var height: SpringState
    var midX: SpringState

    // Tuned for Dynamic Island-like bounce: slight overshoot, quick settle.
    let stiffness: CGFloat = 280
    let damping: CGFloat = 22
    let mass: CGFloat = 1.0

    mutating func advance(dt: CGFloat) {
        width.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
        height.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
        midX.advance(dt: dt, stiffness: stiffness, damping: damping, mass: mass)
    }

    var isSettled: Bool {
        width.isSettled && height.isSettled && midX.isSettled
    }
}
