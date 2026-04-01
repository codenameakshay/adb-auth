import Foundation

public enum ProcessRunnerError: LocalizedError, Sendable {
    case timeout(executable: String, timeout: TimeInterval)
    case nonZeroExit(executable: String, status: Int32, output: String)

    public var errorDescription: String? {
        switch self {
        case let .timeout(executable, timeout):
            return "\(URL(fileURLWithPath: executable).lastPathComponent) timed out after \(Int(timeout))s"
        case let .nonZeroExit(_, _, output):
            let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? "Process failed." : trimmed
        }
    }
}

public enum ProcessRunner {
    public static func run(
        executable: String,
        arguments: [String],
        timeout: TimeInterval,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) async throws -> String {
        try await Task.detached(priority: .utility) {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: executable)
            process.arguments = arguments
            process.environment = environment

            let stdout = Pipe()
            let stderr = Pipe()
            process.standardOutput = stdout
            process.standardError = stderr

            try process.run()

            let deadline = Date().addingTimeInterval(timeout)
            while process.isRunning {
                if Date() >= deadline {
                    process.terminate()
                    process.waitUntilExit()
                    throw ProcessRunnerError.timeout(executable: executable, timeout: timeout)
                }

                try await Task.sleep(for: .milliseconds(50))
            }

            process.waitUntilExit()

            let outputData = stdout.fileHandleForReading.readDataToEndOfFile() + stderr.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: outputData, encoding: .utf8) ?? ""

            guard process.terminationStatus == 0 else {
                throw ProcessRunnerError.nonZeroExit(
                    executable: executable,
                    status: process.terminationStatus,
                    output: output
                )
            }

            return output
        }.value
    }
}
