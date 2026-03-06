interface StatusBarProps {
  adbPath: string | null
  deviceCount: number
}

export function StatusBar({ adbPath, deviceCount }: StatusBarProps) {
  return (
    <div className="h-6 bg-neutral-950 border-t border-neutral-800 flex items-center px-4 gap-4 text-xs text-neutral-500 flex-shrink-0">
      <span>
        ADB: {adbPath ? (
          <span className="text-green-500">Detected</span>
        ) : (
          <span className="text-red-500">Not found</span>
        )}
      </span>
      <span className="text-neutral-700">|</span>
      <span>{deviceCount} device{deviceCount !== 1 ? 's' : ''} connected</span>
    </div>
  )
}
