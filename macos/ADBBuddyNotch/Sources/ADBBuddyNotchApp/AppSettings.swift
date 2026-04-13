import Foundation

struct AppSettings: Equatable {
    var adbPathOverride: String?
    var refreshIntervalSeconds: Double
}

extension AppSettings {
    static let `default` = AppSettings(adbPathOverride: nil, refreshIntervalSeconds: 3)
}

final class AppSettingsStore {
    private enum Keys {
        static let adbPathOverride = "adbBuddy.adbPathOverride"
        static let refreshIntervalSeconds = "adbBuddy.refreshIntervalSeconds"
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load() -> AppSettings {
        let interval = defaults.object(forKey: Keys.refreshIntervalSeconds) as? Double ?? AppSettings.default.refreshIntervalSeconds
        let path = defaults.string(forKey: Keys.adbPathOverride)
        return AppSettings(adbPathOverride: path, refreshIntervalSeconds: interval)
    }

    func save(_ settings: AppSettings) {
        defaults.set(settings.adbPathOverride, forKey: Keys.adbPathOverride)
        defaults.set(settings.refreshIntervalSeconds, forKey: Keys.refreshIntervalSeconds)
    }
}
