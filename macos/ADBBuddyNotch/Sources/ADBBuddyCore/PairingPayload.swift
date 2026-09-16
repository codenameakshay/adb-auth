import Foundation

public struct PairingPayload: Hashable, Sendable {
    public let serviceName: String
    public let password: String

    public init(serviceName: String, password: String) {
        self.serviceName = serviceName
        self.password = password
    }

    public var qrString: String {
        "WIFI:T:ADB;S:\(serviceName);P:\(password);;"
    }

    public static func random() -> PairingPayload {
        PairingPayload(
            serviceName: randomServiceName(),
            password: randomDigits(count: 10)
        )
    }

    private static func randomDigits(count: Int) -> String {
        (0..<count).map { _ in String(Int.random(in: 0...9)) }.joined()
    }

    private static func randomServiceName() -> String {
        let alphabet = Array("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        let suffix = (0..<10).map { _ in String(alphabet.randomElement()!) }.joined()
        return "studio-\(suffix)"
    }
}
