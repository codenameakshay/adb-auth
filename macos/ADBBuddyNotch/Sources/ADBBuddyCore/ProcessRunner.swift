import Foundation
import os

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
    // Drain the pipe while the child runs (a full ~64 KB buffer would block it), and do that
    // blocking read on a dispatch queue rather than the cooperative pool.
    public static func run(
        executable: String,
        arguments: [String],
        timeout: TimeInterval,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                do {
                    let output = try runBlocking(
                        executable: executable,
                        arguments: arguments,
                        timeout: timeout,
                        environment: environment
                    )
                    continuation.resume(returning: output)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    private static func runBlocking(
        executable: String,
        arguments: [String],
        timeout: TimeInterval,
        environment: [String: String]
    ) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        process.environment = environment

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        try process.run()

        let timedOut = OSAllocatedUnfairLock(initialState: false)
        let timeoutWorkItem = DispatchWorkItem {
            timedOut.withLock { $0 = true }
            process.terminate()
        }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + timeout, execute: timeoutWorkItem)

        let outputData = pipe.fileHandleForReading.readDataToEndOfFile()
        timeoutWorkItem.cancel()
        process.waitUntilExit()

        if timedOut.withLock({ $0 }) {
            throw ProcessRunnerError.timeout(executable: executable, timeout: timeout)
        }

        let output = String(data: outputData, encoding: .utf8) ?? ""

        guard process.terminationStatus == 0 else {
            throw ProcessRunnerError.nonZeroExit(
                executable: executable,
                status: process.terminationStatus,
                output: output
            )
        }

        return output
    }
}
