import { NetworkBadge } from '../wifi/NetworkBadge'

interface StatusBarProps {
  adbPath: string | null
  deviceCount: number
}

export function StatusBar({ adbPath, deviceCount }: StatusBarProps) {
  return (
    <footer className="ui-status-footer">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className="ui-chip max-w-[min(100%,14rem)] truncate sm:max-w-none"
          role="status"
          aria-live="polite"
          title={adbPath ? `Using: ${adbPath}` : 'Set the path under Settings if ADB is not found.'}
        >
          <span className="text-app-text-faint">ADB</span>
          <span className={adbPath ? 'text-app-accent-green' : 'text-app-danger'}>
            {adbPath ? 'Found' : 'Not found'}
          </span>
        </span>
        <span className="ui-chip" role="status" aria-live="polite" title="Devices currently in “connected” state">
          <span className="text-app-text-faint">Connected</span>
          <span
            className={
              deviceCount > 0 ? 'font-semibold text-app-accent-green tabular-nums' : 'tabular-nums text-app-text-secondary'
            }
          >
            {deviceCount}
          </span>
        </span>
        <NetworkBadge />
      </div>
    </footer>
  )
}
