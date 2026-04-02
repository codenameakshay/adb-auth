import AppKit
import ADBBuddyCore
import Combine
import SwiftUI

enum NotchViewMode: Equatable {
    case loading
    case adbMissing
    case pairing
    case connected
}

struct PanelLayout: Equatable {
    let size: CGSize

    static let expandedOverlay = PanelLayout(size: OverlayLayout.expandedSurface)
    static let loading = expandedOverlay
    static let adbMissing = expandedOverlay
    static let pairing = expandedOverlay

    static func connected(extraRows: Int) -> PanelLayout {
        expandedOverlay
    }
}

@MainActor
final class NotchAppState: ObservableObject {
    @Published var isExpanded = false {
        didSet {
            updatePresentation()
            if isExpanded {
                Task { await handleExpansion() }
            }
        }
    }

    @Published var isShowingSettings = false
    @Published var adbPathInput: String
    @Published var refreshIntervalSeconds: Double

    @Published private(set) var resolvedAdbPath: String?
    @Published private(set) var connectedDevices: [Device] = []
    @Published private(set) var nonConnectedDevices: [Device] = []
    @Published private(set) var pairingPayload: PairingPayload?
    @Published private(set) var pairingProgress: PairingProgress = .idle
    @Published private(set) var qrImage: NSImage?
    @Published private(set) var runtimeError: String?
    @Published private(set) var settingsMessage: String?
    @Published private(set) var viewMode: NotchViewMode = .loading
    @Published private(set) var panelLayout: PanelLayout = .loading

    private let settingsStore = AppSettingsStore()
    private let adbClient: ADBClient
    private var pollTask: Task<Void, Never>?
    private var pairingTask: Task<Void, Never>?
    private var hasLoadedOnce = false
    private var lastConnectedSerial: String?

    init() {
        let settings = settingsStore.load()
        adbPathInput = settings.adbPathOverride ?? ""
        refreshIntervalSeconds = settings.refreshIntervalSeconds
        adbClient = ADBClient(adbPathOverride: settings.adbPathOverride)
        updatePresentation()
    }

    deinit {
        pollTask?.cancel()
        pairingTask?.cancel()
    }

    var primaryDevice: Device? {
        PrimaryDeviceSelector.select(from: connectedDevices, preferredSerial: lastConnectedSerial)
    }

    var secondaryDevices: [Device] {
        guard let primaryDevice else { return [] }
        return connectedDevices.filter { $0.serial != primaryDevice.serial }
    }

    var collapsedTitle: String {
        switch viewMode {
        case .loading:
            return "ADB Buddy"
        case .adbMissing:
            return "ADB Setup"
        case .pairing:
            return pairingProgress.stage == .idle ? "Ready to Pair" : "Pairing"
        case .connected:
            return primaryDevice?.model?.replacingOccurrences(of: "_", with: " ") ?? "Connected"
        }
    }

    var collapsedSubtitle: String {
        switch viewMode {
        case .loading:
            return "Starting up"
        case .adbMissing:
            return "ADB not found"
        case .pairing:
            return pairingProgress.detail ?? "Click to show QR"
        case .connected:
            if secondaryDevices.isEmpty {
                return primaryDevice?.serial ?? "1 device"
            }
            return "\(secondaryDevices.count + 1) devices connected"
        }
    }

    var expandedTitle: String {
        switch viewMode {
        case .loading:
            return "Starting ADB Buddy"
        case .adbMissing:
            return "Set up ADB"
        case .pairing:
            return "Pair over Wi-Fi"
        case .connected:
            return "Current Device"
        }
    }

    var expandedSubtitle: String {
        switch viewMode {
        case .loading:
            return "Checking your local Android tooling."
        case .adbMissing:
            return "Point the app to a working platform-tools/adb executable."
        case .pairing:
            return "Scan the QR code from Android Wireless debugging."
        case .connected:
            return secondaryDevices.isEmpty
                ? "The notch shows your active device at a glance."
                : "Showing your primary device with \(secondaryDevices.count) more connected."
        }
    }

    var indicatorColor: Color {
        switch viewMode {
        case .loading:
            return .yellow
        case .adbMissing:
            return .red
        case .pairing:
            switch pairingProgress.stage {
            case .error:
                return .red
            case .success:
                return .green
            default:
                return .blue
            }
        case .connected:
            return .green
        }
    }

    func launch() {
        startPollingLoop()
        Task {
            await refreshState(autoStartPairing: false)
        }
    }

    func toggleExpanded() {
        isExpanded.toggle()
    }

    func expand() {
        isExpanded = true
    }

    func dismissExpanded() {
        isExpanded = false
    }

    func refreshNow() {
        Task { await refreshState(autoStartPairing: isExpanded) }
    }

    func restartPairing() {
        Task {
            cancelPairing()
            await startPairingIfNeeded(force: true)
        }
    }

    func cancelPairing() {
        pairingTask?.cancel()
        pairingTask = nil
        pairingPayload = nil
        qrImage = nil
        pairingProgress = .idle
        runtimeError = nil
        updatePresentation()
    }

    func saveSettings() async {
        let trimmedPath = normalizedAdbPathInput
        settingsMessage = nil

        if let trimmedPath, !(await adbClient.validatePath(trimmedPath)) {
            settingsMessage = "That path doesn’t look like a working adb."
            return
        }

        let settings = AppSettings(adbPathOverride: trimmedPath, refreshIntervalSeconds: refreshIntervalSeconds)
        settingsStore.save(settings)
        await adbClient.setAdbPathOverride(trimmedPath)
        settingsMessage = trimmedPath == nil
            ? "Using auto-detection for adb."
            : "Saved ADB override."

        startPollingLoop()
        await refreshState(autoStartPairing: isExpanded)
    }

    func restartAdbServer() async {
        do {
            try await adbClient.killServer()
            try await adbClient.startServer()
            settingsMessage = "ADB server restarted."
            await refreshState(autoStartPairing: isExpanded)
        } catch {
            settingsMessage = error.localizedDescription
        }
    }

    func disconnect(_ device: Device) async {
        do {
            _ = try await adbClient.disconnect(serial: device.serial)
            await refreshState(autoStartPairing: isExpanded)
        } catch {
            runtimeError = error.localizedDescription
            updatePresentation()
        }
    }

    func quitApp() {
        NSApp.terminate(nil)
    }

    private var normalizedAdbPathInput: String? {
        let trimmed = adbPathInput.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func handleExpansion() async {
        await refreshState(autoStartPairing: true)
    }

    private func startPollingLoop() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while let self, !Task.isCancelled {
                let delay = await MainActor.run { self.refreshIntervalSeconds }
                try? await Task.sleep(for: .milliseconds(Int64(delay * 1_000)))
                if Task.isCancelled { break }
                let autoStartPairing = await MainActor.run { self.isExpanded }
                await self.refreshState(autoStartPairing: autoStartPairing)
            }
        }
    }

    private func refreshState(autoStartPairing: Bool) async {
        await adbClient.setAdbPathOverride(normalizedAdbPathInput)
        resolvedAdbPath = await adbClient.resolvedAdbPath()
        hasLoadedOnce = true

        guard resolvedAdbPath != nil else {
            connectedDevices = []
            nonConnectedDevices = []
            runtimeError = "ADB not found. Install Android platform-tools or save a manual path."
            cancelPairing()
            updatePresentation()
            return
        }

        do {
            let devices = try await adbClient.getDevices()
            connectedDevices = devices.connectedDevices
            nonConnectedDevices = devices.filter { $0.status != .device }
            if let primary = primaryDevice {
                lastConnectedSerial = primary.serial
            }
            runtimeError = nil
        } catch {
            connectedDevices = []
            nonConnectedDevices = []
            runtimeError = error.localizedDescription
        }

        updatePresentation()

        if autoStartPairing, connectedDevices.isEmpty {
            await startPairingIfNeeded(force: false)
        }
    }

    private func startPairingIfNeeded(force: Bool) async {
        guard resolvedAdbPath != nil else { return }
        guard connectedDevices.isEmpty else { return }

        if !force {
            if pairingTask != nil { return }
            switch pairingProgress.stage {
            case .idle, .success:
                break
            case .error:
                return
            default:
                return
            }
        }

        let payload = PairingPayloadFactory.make()
        pairingPayload = payload
        qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        pairingProgress = PairingProgress(
            stage: .waitingForScan,
            detail: "Scan this QR code from Wireless debugging on your Android device."
        )
        runtimeError = nil
        updatePresentation()

        pairingTask = Task { [weak self] in
            await self?.runPairingFlow(payload)
        }
    }

    private func runPairingFlow(_ payload: PairingPayload) async {
        defer { pairingTask = nil }

        do {
            pairingProgress = PairingProgress(
                stage: .waitingForPairingService,
                detail: "Waiting for your Android device pairing service..."
            )
            updatePresentation()

            let pairingService = try await adbClient.waitForMDNSService(
                kind: .pairing,
                name: payload.serviceName,
                timeout: 90,
                pollInterval: 1.5
            )

            let pairingHost = pairingService.host.trimmingCharacters(in: CharacterSet(charactersIn: "."))
            pairingProgress = PairingProgress(
                stage: .pairing,
                detail: "Pairing with \(pairingHost):\(pairingService.port)...",
                androidHost: pairingHost
            )
            updatePresentation()

            let pairOutput = try await adbClient.pair(
                host: pairingHost,
                port: pairingService.port,
                code: payload.password
            )
            guard ADBParsing.isPairSuccessful(pairOutput) else {
                throw ADBClientError.unexpectedOutput(pairOutput)
            }

            pairingProgress = PairingProgress(
                stage: .waitingForConnectService,
                detail: "Pairing accepted. Waiting for wireless debug endpoint...",
                androidHost: pairingHost
            )
            updatePresentation()

            let connectService = try await adbClient.waitForMDNSService(
                kind: .connect,
                hostHint: pairingHost,
                timeout: 45,
                pollInterval: 1.5
            )

            let connectHost = connectService.host.trimmingCharacters(in: CharacterSet(charactersIn: "."))
            pairingProgress = PairingProgress(
                stage: .connecting,
                detail: "Connecting to \(connectHost):\(connectService.port)...",
                androidHost: connectHost
            )
            updatePresentation()

            let connectOutput = try await adbClient.connect(
                host: connectHost,
                port: connectService.port
            )
            guard ADBParsing.isConnectSuccessful(connectOutput) else {
                throw ADBClientError.unexpectedOutput(connectOutput)
            }

            pairingProgress = PairingProgress(
                stage: .success,
                detail: "Connected to \(connectHost):\(connectService.port)",
                androidHost: connectHost
            )
            updatePresentation()

            try? await Task.sleep(for: .milliseconds(900))
            await refreshState(autoStartPairing: false)
        } catch is CancellationError {
            pairingProgress = .idle
            updatePresentation()
        } catch {
            pairingProgress = PairingProgress(
                stage: .error,
                error: error.localizedDescription
            )
            runtimeError = error.localizedDescription
            updatePresentation()
        }
    }

    private func updatePresentation() {
        if !hasLoadedOnce {
            viewMode = .loading
        } else if resolvedAdbPath == nil {
            viewMode = .adbMissing
        } else if !connectedDevices.isEmpty {
            viewMode = .connected
        } else {
            viewMode = .pairing
        }

        switch viewMode {
        case .loading:
            panelLayout = .loading
        case .adbMissing:
            panelLayout = .adbMissing
        case .pairing:
            panelLayout = .pairing
        case .connected:
            panelLayout = .connected(extraRows: secondaryDevices.count)
        }
    }
}
