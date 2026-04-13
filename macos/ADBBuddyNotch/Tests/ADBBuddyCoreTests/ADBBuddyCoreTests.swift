import XCTest
@testable import ADBBuddyCore

final class ADBBuddyCoreTests: XCTestCase {
    func testParseDeviceListParsesUSBAndWirelessDevices() {
        let output = """
        List of devices attached
        emulator-5554 device product:sdk_gphone64_arm64 model:Pixel_8_Pro device:emu64a transport_id:5
        192.168.1.44:39029 offline product:panther model:Pixel_7 device:panther transport_id:8
        """

        let devices = ADBParsing.parseDeviceList(output)

        XCTAssertEqual(devices.count, 2)
        XCTAssertEqual(devices[0].serial, "emulator-5554")
        XCTAssertEqual(devices[0].isWireless, false)
        XCTAssertEqual(devices[0].model, "Pixel_8_Pro")
        XCTAssertEqual(devices[1].host, "192.168.1.44")
        XCTAssertEqual(devices[1].port, 39029)
        XCTAssertEqual(devices[1].status, .offline)
    }

    func testParseMDNSServicesParsesPairingAndConnectServices() {
        let output = """
        studio-abc _adb-tls-pairing._tcp. local. 192.168.1.44:37185
        pixel-7 _adb-tls-connect._tcp. local. 192.168.1.44:39029
        """

        let services = ADBParsing.parseMDNSServices(output)

        XCTAssertEqual(services.count, 2)
        XCTAssertEqual(services[0].kind, .pairing)
        XCTAssertEqual(services[0].port, 37185)
        XCTAssertEqual(services[1].kind, .connect)
        XCTAssertEqual(services[1].host, "192.168.1.44")
    }

    func testPrimaryDeviceSelectorPrefersPreferredSerialThenWireless() {
        let usb = Device(serial: "usb-1", status: .device, model: "Pixel_6", isWireless: false)
        let wifi = Device(serial: "192.168.1.44:39029", status: .device, model: "Pixel_7", isWireless: true, host: "192.168.1.44", port: 39029)

        XCTAssertEqual(
            PrimaryDeviceSelector.select(from: [usb, wifi], preferredSerial: "usb-1")?.serial,
            "usb-1"
        )
        XCTAssertEqual(
            PrimaryDeviceSelector.select(from: [usb, wifi], preferredSerial: nil)?.serial,
            "192.168.1.44:39029"
        )
    }

    func testPairingPayloadFactoryCreatesADBWifiPayload() {
        let payload = PairingPayloadFactory.make()

        XCTAssertTrue(payload.serviceName.hasPrefix("studio-"))
        XCTAssertEqual(payload.password.count, 10)
        XCTAssertTrue(payload.qrString.hasPrefix("WIFI:T:ADB;S:"))
        XCTAssertTrue(payload.qrString.hasSuffix(";;"))
    }

    func testCandidatePathsIncludesCommonMacPathsAndPathEntries() {
        let candidates = ADBPathResolver.candidatePaths(
            homeDirectory: "/Users/example",
            environment: ["ANDROID_HOME": "/opt/android-sdk"],
            pathDirectories: ["/opt/homebrew/bin"]
        )

        XCTAssertTrue(candidates.contains("/opt/android-sdk/platform-tools/adb"))
        XCTAssertTrue(candidates.contains("/Users/example/Library/Android/sdk/platform-tools/adb"))
        XCTAssertTrue(candidates.contains("/opt/homebrew/bin/adb"))
    }
}
