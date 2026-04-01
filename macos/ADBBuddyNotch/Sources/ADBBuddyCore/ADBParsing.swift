import Foundation

public enum ADBParsing {
    public static func parseDeviceList(_ output: String) -> [Device] {
        output
            .split(whereSeparator: \.isNewline)
            .compactMap { rawLine -> Device? in
                let line = String(rawLine).trimmingCharacters(in: .whitespacesAndNewlines)
                guard !line.isEmpty else { return nil }
                guard !line.hasPrefix("List of devices") else { return nil }
                guard !line.hasPrefix("*") else { return nil }

                let parts = line.split(whereSeparator: \.isWhitespace).map(String.init)
                guard parts.count >= 2 else { return nil }
                guard let status = DeviceStatus(rawValue: parts[1]) else { return nil }

                let serial = parts[0]
                let isWireless = serial.contains(":")

                var host: String?
                var port: Int?
                if isWireless, let colon = serial.lastIndex(of: ":") {
                    host = String(serial[..<colon])
                    port = Int(serial[serial.index(after: colon)...])
                }

                var fields: [String: String] = [:]
                for part in parts.dropFirst(2) {
                    let pair = part.split(separator: ":", maxSplits: 1).map(String.init)
                    guard pair.count == 2 else { continue }
                    fields[pair[0]] = pair[1]
                }

                return Device(
                    serial: serial,
                    status: status,
                    model: fields["model"],
                    product: fields["product"],
                    isWireless: isWireless,
                    host: host,
                    port: port
                )
            }
    }

    public static func parseMDNSServices(_ output: String) -> [MDNSService] {
        let regex = try? NSRegularExpression(pattern: #"([A-Za-z0-9._:-]+):(\d+)\s*$"#)

        return output
            .split(whereSeparator: \.isNewline)
            .compactMap { rawLine -> MDNSService? in
                let line = String(rawLine).trimmingCharacters(in: .whitespacesAndNewlines)
                guard !line.isEmpty else { return nil }
                guard !line.hasPrefix("*") else { return nil }
                guard !line.lowercased().contains("list of discovered") else { return nil }

                guard let kind = MDNSServiceKind.allCases.first(where: { line.contains($0.rawValue) }) else {
                    return nil
                }

                let parts = line.split(whereSeparator: \.isWhitespace).map(String.init)
                let name = parts.first ?? "unknown"

                guard let regex else { return nil }
                let nsLine = line as NSString
                let range = NSRange(location: 0, length: nsLine.length)
                guard let match = regex.firstMatch(in: line, range: range),
                      match.numberOfRanges == 3 else {
                    return nil
                }

                let host = nsLine.substring(with: match.range(at: 1))
                    .trimmingCharacters(in: CharacterSet(charactersIn: "[]"))
                    .replacingOccurrences(of: ".", with: "", options: .anchored)
                guard let port = Int(nsLine.substring(with: match.range(at: 2))) else {
                    return nil
                }

                return MDNSService(name: name, host: host, port: port, kind: kind)
            }
    }

    public static func isPairSuccessful(_ output: String) -> Bool {
        let normalized = output.lowercased()
        return normalized.contains("successfully paired") || normalized.contains("paired to")
    }

    public static func isConnectSuccessful(_ output: String) -> Bool {
        output.lowercased().contains("connected to")
    }
}
