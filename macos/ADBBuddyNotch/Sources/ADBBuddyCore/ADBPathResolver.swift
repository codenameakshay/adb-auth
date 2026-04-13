import Foundation

public enum ADBPathResolver {
    public static func candidatePaths(
        homeDirectory: String = NSHomeDirectory(),
        environment: [String: String] = ProcessInfo.processInfo.environment,
        pathDirectories: [String]? = nil
    ) -> [String] {
        var candidates: [String] = []

        func append(_ path: String?) {
            guard let path, !path.isEmpty else { return }
            candidates.append((path as NSString).expandingTildeInPath)
        }

        for key in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
            if let sdk = environment[key] {
                append(URL(fileURLWithPath: sdk).appending(path: "platform-tools/adb").path)
            }
        }

        append(URL(fileURLWithPath: homeDirectory).appending(path: "Library/Android/sdk/platform-tools/adb").path)
        append(URL(fileURLWithPath: homeDirectory).appending(path: "Android/Sdk/platform-tools/adb").path)
        append("/opt/homebrew/bin/adb")
        append("/usr/local/bin/adb")

        let searchPaths = pathDirectories ?? (environment["PATH"]?
            .split(separator: ":")
            .map(String.init) ?? [])
        for path in searchPaths {
            append(URL(fileURLWithPath: path).appending(path: "adb").path)
        }

        var seen = Set<String>()
        return candidates.filter { seen.insert($0).inserted }
    }

    public static func detectAdbPath(
        homeDirectory: String = NSHomeDirectory(),
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) async -> String? {
        for candidate in candidatePaths(homeDirectory: homeDirectory, environment: environment) {
            guard FileManager.default.isExecutableFile(atPath: candidate) else { continue }
            if await validateAdbPath(candidate) {
                return candidate
            }
        }

        return nil
    }

    public static func validateAdbPath(_ path: String) async -> Bool {
        guard FileManager.default.isExecutableFile(atPath: path) else { return false }

        do {
            let output = try await ProcessRunner.run(
                executable: path,
                arguments: ["version"],
                timeout: 5
            )
            return output.contains("Android Debug Bridge")
        } catch {
            return false
        }
    }
}
