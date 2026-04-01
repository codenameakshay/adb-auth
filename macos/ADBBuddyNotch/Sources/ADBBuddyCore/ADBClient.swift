import Foundation

public enum ADBClientError: LocalizedError, Sendable {
    case adbNotConfigured
    case unexpectedOutput(String)
    case timedOut(kind: MDNSServiceKind)

    public var errorDescription: String? {
        switch self {
        case .adbNotConfigured:
            return "ADB path not configured."
        case let .unexpectedOutput(output):
            let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? "ADB returned unexpected output." : trimmed
        case let .timedOut(kind):
            return "Timed out waiting for \(kind.rawValue)."
        }
    }
}

public actor ADBClient {
    private var adbPathOverride: String?
    private let environment: [String: String]

    public init(
        adbPathOverride: String? = nil,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) {
        self.adbPathOverride = Self.normalizedOverride(adbPathOverride)
        self.environment = environment
    }

    public func setAdbPathOverride(_ overridePath: String?) {
        adbPathOverride = Self.normalizedOverride(overridePath)
    }

    public func resolvedAdbPath() async -> String? {
        if let adbPathOverride, await ADBPathResolver.validateAdbPath(adbPathOverride) {
            return adbPathOverride
        }

        return await ADBPathResolver.detectAdbPath(environment: environment)
    }

    public func validatePath(_ path: String) async -> Bool {
        await ADBPathResolver.validateAdbPath(path)
    }

    public func getDevices() async throws -> [Device] {
        let output = try await run(["devices", "-l"])
        return ADBParsing.parseDeviceList(output)
    }

    public func pair(host: String, port: Int, code: String) async throws -> String {
        try await run(["pair", "\(host):\(port)", code], timeout: 30)
    }

    public func connect(host: String, port: Int) async throws -> String {
        try await run(["connect", "\(host):\(port)"], timeout: 15)
    }

    public func disconnect(serial: String) async throws -> String {
        try await run(["disconnect", serial], timeout: 10)
    }

    public func killServer() async throws {
        _ = try await run(["kill-server"], timeout: 10)
    }

    public func startServer() async throws {
        _ = try await run(["start-server"], timeout: 15)
    }

    public func discoverMDNSServices(kind: MDNSServiceKind? = nil) async throws -> [MDNSService] {
        let output = try await run(["mdns", "services"], timeout: 15)
        let services = ADBParsing.parseMDNSServices(output)
        guard let kind else { return services }
        return services.filter { $0.kind == kind }
    }

    public func waitForMDNSService(
        kind: MDNSServiceKind,
        name: String? = nil,
        hostHint: String? = nil,
        timeout: TimeInterval = 30,
        pollInterval: TimeInterval = 1.5
    ) async throws -> MDNSService {
        let deadline = Date().addingTimeInterval(timeout)
        let normalizedHostHint = hostHint?.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()

        while Date() < deadline {
            try Task.checkCancellation()
            let services = try await discoverMDNSServices(kind: kind)
            if let match = services.first(where: { service in
                if let name, service.name != name {
                    return false
                }

                if let normalizedHostHint {
                    return service.host.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased() == normalizedHostHint
                }

                return true
            }) {
                return match
            }

            try await Task.sleep(for: .milliseconds(Int64(pollInterval * 1_000)))
        }

        throw ADBClientError.timedOut(kind: kind)
    }

    private func run(_ arguments: [String], timeout: TimeInterval = 10) async throws -> String {
        let executable = try await adbExecutable()
        return try await ProcessRunner.run(
            executable: executable,
            arguments: arguments,
            timeout: timeout,
            environment: environment
        )
    }

    private func adbExecutable() async throws -> String {
        guard let executable = await resolvedAdbPath() else {
            throw ADBClientError.adbNotConfigured
        }

        return executable
    }

    private static func normalizedOverride(_ overridePath: String?) -> String? {
        guard let overridePath else {
            return nil
        }

        let trimmed = overridePath.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
