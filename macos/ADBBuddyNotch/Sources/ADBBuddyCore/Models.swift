import Foundation

public enum DeviceStatus: String, Sendable {
    case device
    case offline
    case unauthorized
    case connecting
}

public struct Device: Identifiable, Hashable, Sendable {
    public let serial: String
    public let status: DeviceStatus
    public let model: String?
    public let product: String?
    public let isWireless: Bool
    public let host: String?
    public let port: Int?

    public init(
        serial: String,
        status: DeviceStatus,
        model: String? = nil,
        product: String? = nil,
        isWireless: Bool,
        host: String? = nil,
        port: Int? = nil
    ) {
        self.serial = serial
        self.status = status
        self.model = model
        self.product = product
        self.isWireless = isWireless
        self.host = host
        self.port = port
    }

    public var id: String { serial }
}

public enum MDNSServiceKind: String, CaseIterable, Sendable {
    case connect = "_adb-tls-connect._tcp"
    case pairing = "_adb-tls-pairing._tcp"
}

public struct MDNSService: Hashable, Sendable {
    public let name: String
    public let host: String
    public let port: Int
    public let kind: MDNSServiceKind

    public init(name: String, host: String, port: Int, kind: MDNSServiceKind) {
        self.name = name
        self.host = host
        self.port = port
        self.kind = kind
    }
}

public enum PairingStage: String, Sendable {
    case idle
    case waitingForScan
    case waitingForPairingService
    case pairing
    case waitingForConnectService
    case connecting
    case success
    case error
}

public struct PairingProgress: Hashable, Sendable {
    public let stage: PairingStage
    public let detail: String?
    public let androidHost: String?
    public let error: String?

    public init(
        stage: PairingStage,
        detail: String? = nil,
        androidHost: String? = nil,
        error: String? = nil
    ) {
        self.stage = stage
        self.detail = detail
        self.androidHost = androidHost
        self.error = error
    }
}

public extension PairingProgress {
    static let idle = PairingProgress(stage: .idle)
}

public extension Array where Element == Device {
    var connectedDevices: [Device] {
        filter { $0.status == .device }
    }

    func primaryDevice(preferredSerial: String?) -> Device? {
        let connected = connectedDevices
        guard !connected.isEmpty else { return nil }

        if let preferredSerial,
           let preferred = connected.first(where: { $0.serial == preferredSerial }) {
            return preferred
        }

        if let wireless = connected.first(where: \.isWireless) {
            return wireless
        }

        return connected.first
    }
}
