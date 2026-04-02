// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ADBBuddyNotch",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .library(
            name: "ADBBuddyCore",
            targets: ["ADBBuddyCore"]
        ),
        .executable(
            name: "ADBBuddyNotchApp",
            targets: ["ADBBuddyNotchApp"]
        ),
    ],
    targets: [
        .target(
            name: "ADBBuddyCore"
        ),
        .executableTarget(
            name: "ADBBuddyNotchApp",
            dependencies: ["ADBBuddyCore"]
        ),
        .testTarget(
            name: "ADBBuddyCoreTests",
            dependencies: ["ADBBuddyCore"]
        ),
        .testTarget(
            name: "ADBBuddyNotchAppTests",
            dependencies: ["ADBBuddyNotchApp"]
        ),
    ]
)
