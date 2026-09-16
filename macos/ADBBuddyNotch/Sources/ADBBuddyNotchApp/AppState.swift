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

    static let loading    = PanelLayout(size: CGSize(width: 350, height: 200))
    static let adbMissing = PanelLayout(size: CGSize(width: 350, height: 340))
    static let pairing    = PanelLayout(size: CGSize(width: 350, height: 430))

    static func connected(hasPrimary: Bool) -> PanelLayout {
        PanelLayout(size: CGSize(width: 450, height: hasPrimary ? 210 : 110))
    }
}

@MainActor
final class NotchAppState: ObservableObject {
    @Published var isExpanded = false {
        didSet {
            updatePresentation()
            if isExpanded {
                Task { await refreshState(autoStartPairing: true) }
            }
        }
    }

    @Published var isShowingSettings = false
    @Published var adbPathInput: String
    @Published var refreshIntervalSeconds: Double

    @Published private(set) var resolvedAdbPath: String?
    @Published private(set) var connectedDevices: [Device] = []
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
        connectedDevices.primaryDevice(preferredSerial: lastConnectedSerial)
    }

    var secondaryDevices: [Device] {
        guard let primaryDevice else { return [] }
        return connectedDevices.filter { $0.serial != primaryDevice.serial }
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
        updatePresentation()
    }

    func saveSettings() async {
        let trimmedPath = normalizedAdbPathInput
        settingsMessage = nil

        if let trimmedPath, !(await ADBPathResolver.validateAdbPath(trimmedPath)) {
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

    private var normalizedAdbPathInput: String? {
        let trimmed = adbPathInput.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func startPollingLoop() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let delay = self?.refreshIntervalSeconds else { return }
                try? await Task.sleep(for: .milliseconds(Int64(delay * 1_000)))
                if Task.isCancelled { break }
                guard let self else { return }
                await self.refreshState(autoStartPairing: self.isExpanded)
            }
        }
    }

    private func refreshState(autoStartPairing: Bool) async {
        resolvedAdbPath = await adbClient.resolvedAdbPath()
        hasLoadedOnce = true

        guard resolvedAdbPath != nil else {
            connectedDevices = []
            cancelPairing()
            updatePresentation()
            return
        }

        do {
            let devices = try await adbClient.getDevices()
            connectedDevices = devices.connectedDevices
            if let primary = primaryDevice {
                lastConnectedSerial = primary.serial
            }
            runtimeError = nil
        } catch {
            connectedDevices = []
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
            guard pairingTask == nil, pairingProgress.stage == .idle || pairingProgress.stage == .success else { return }
        }

        let payload = PairingPayload.random()
        pairingPayload = payload
        qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        pairingProgress = PairingProgress(
            stage: .waitingForScan,
            detail: "Scan this QR code from Wireless debugging on your Android device."
        )
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

            let pairingHost = pairingService.host
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

            let connectHost = connectService.host
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
            panelLayout = .connected(hasPrimary: primaryDevice != nil)
        }
    }
}

#if DEBUG
extension NotchAppState {
    static func previewLoading() -> NotchAppState {
        let s = NotchAppState()
        // hasLoadedOnce stays false → .loading mode
        s.updatePresentation()
        return s
    }

    static func previewAdbMissing() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.updatePresentation()
        return s
    }

    // MARK: - Pairing sub-stages

    static func previewPairingIdle() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        s.pairingProgress = .idle
        s.updatePresentation()
        return s
    }

    static func previewPairing() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(stage: .waitingForScan)
        s.updatePresentation()
        return s
    }

    static func previewPairingInProgress() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(stage: .waitingForPairingService, androidHost: "192.168.1.100")
        s.updatePresentation()
        return s
    }

    static func previewPairingActive() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(
            stage: .pairing,
            detail: "Pairing with 192.168.1.100:37513...",
            androidHost: "192.168.1.100"
        )
        s.updatePresentation()
        return s
    }

    static func previewPairingWaitingConnect() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(
            stage: .waitingForConnectService,
            detail: "Pairing accepted. Waiting for wireless debug endpoint...",
            androidHost: "192.168.1.100"
        )
        s.updatePresentation()
        return s
    }

    static func previewPairingConnecting() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(
            stage: .connecting,
            detail: "Connecting to 192.168.1.100:5555...",
            androidHost: "192.168.1.100"
        )
        s.updatePresentation()
        return s
    }

    static func previewPairingSuccess() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(
            stage: .success,
            detail: "Connected to 192.168.1.100:5555",
            androidHost: "192.168.1.100"
        )
        s.updatePresentation()
        return s
    }

    static func previewPairingError() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        let payload = PairingPayload(serviceName: "studio-rC3ul887of", password: "1234567890")
        s.pairingPayload = payload
        s.qrImage = QRCodeRenderer.image(from: payload.qrString, dimension: 220)
        s.pairingProgress = PairingProgress(
            stage: .error,
            error: "Timed out waiting for pairing service. Make sure Wireless debugging is active."
        )
        s.runtimeError = "Timed out waiting for pairing service. Make sure Wireless debugging is active."
        s.updatePresentation()
        return s
    }

    // MARK: - Connected variations

    static func previewConnectedSingleWireless() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        s.connectedDevices = [
            Device(serial: "192.168.1.100:5555", status: .device, model: "Pixel_7", product: "panther", isWireless: true, host: "192.168.1.100", port: 5555),
        ]
        s.updatePresentation()
        return s
    }

    static func previewConnectedSingleUSB() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        s.connectedDevices = [
            Device(serial: "ZY224BVDPJ", status: .device, model: "Pixel_8", product: "shiba", isWireless: false),
        ]
        s.updatePresentation()
        return s
    }

    static func previewConnected() -> NotchAppState {
        let s = NotchAppState()
        s.hasLoadedOnce = true
        s.resolvedAdbPath = "/usr/local/bin/adb"
        s.connectedDevices = [
            Device(serial: "192.168.1.100:5555", status: .device, model: "Pixel_7", product: "panther", isWireless: true, host: "192.168.1.100", port: 5555),
            Device(serial: "192.168.1.101:5555", status: .device, model: "Pixel_6", product: "oriole", isWireless: true, host: "192.168.1.101", port: 5555),
        ]
        s.updatePresentation()
        return s
    }
}
#endif
