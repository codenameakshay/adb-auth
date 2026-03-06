interface StatusBarProps {
  adbPath: string | null
  deviceCount: number
}

export function StatusBar({ adbPath, deviceCount }: StatusBarProps) {
  return (
    <footer className="flex h-9 items-center gap-3 border-t border-white/10 bg-slate-950/50 px-4 text-xs text-[var(--text-muted)]">
      <span className="ui-chip" role="status" aria-live="polite">
        ADB
        <span className={adbPath ? 'text-green-300' : 'text-red-300'}>{adbPath ? 'Detected' : 'Not Found'}</span>
      </span>
      <span className="ui-chip" role="status" aria-live="polite">
        Devices
        <span className="text-[var(--text-secondary)]">{deviceCount}</span>
      </span>
    </footer>
  )
}
