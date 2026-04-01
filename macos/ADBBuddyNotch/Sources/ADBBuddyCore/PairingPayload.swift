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
}

public enum PairingPayloadFactory {
    public static func make() -> PairingPayload {
        PairingPayload(
            serviceName: randomServiceName(),
            password: randomDigits(count: 10)
        )
    }

    private static func randomDigits(count: Int) -> String {
        var generator = SystemRandomNumberGenerator()
        return (0..<count).map { _ in String(Int.random(in: 0...9, using: &generator)) }.joined()
    }

    private static func randomServiceName() -> String {
        let alphabet = Array("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        var generator = SystemRandomNumberGenerator()
        let suffix = (0..<10).map { _ in String(alphabet.randomElement(using: &generator)!) }.joined()
        return "studio-\(suffix)"
    }
}
