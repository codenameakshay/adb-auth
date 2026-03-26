import { Smartphone, Wifi, Copy, PlugZap, Unplug, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { DeviceStatusBadge } from './DeviceStatusBadge'
import { cn } from '../../lib/utils'
import type { AdbDevice } from '../../../shared/types'

interface DeviceCardProps {
  device: AdbDevice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConnect: (host: string, port: number) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDisconnect: (serial: string) => Promise<any>
}

export function DeviceCard({ device, onConnect, onDisconnect }: DeviceCardProps) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const copySerial = () => {
    navigator.clipboard.writeText(device.serial).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleConnect = async () => {
    if (!device.ip || !device.port) return
    setBusy(true)
    try {
      await onConnect(device.ip, device.port)
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try {
      await onDisconnect(device.serial)
    } finally {
      setBusy(false)
    }
  }

  const displayName = device.model?.replace(/_/g, ' ') || 'Unknown Device'

  return (
    <article
      className={cn(
        'glass-panel-strong flex items-start gap-4 p-4 transition-colors duration-200',
        device.status === 'device' && 'ui-surface-connected'
      )}
    >
      <div
        className={cn(
          'ui-icon-tile ui-icon-tile--md',
          device.isWifi ? 'ui-icon-tile--accent-blue' : 'ui-icon-tile--neutral'
        )}
      >
        {device.isWifi ? <Wifi className="h-5 w-5" aria-hidden /> : <Smartphone className="h-5 w-5" aria-hidden />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-app-text-primary">{displayName}</h3>
          <DeviceStatusBadge status={device.status} />
        </div>

        <button
          type="button"
          onClick={copySerial}
          className="group flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-app-text-muted transition-colors hover:bg-[var(--surface-hover-faint)] hover:text-app-text-secondary"
          aria-label="Copy device serial"
        >
          {copied ? <span className="text-app-accent-green">Copied serial</span> : <span className="font-code">{device.serial}</span>}
          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-80" aria-hidden />
        </button>

        {device.isWifi && device.ip && (
          <p className="font-code text-xs text-app-text-faint">
            {device.ip}:{device.port}
          </p>
        )}

        {device.status === 'unauthorized' && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-app-warning" role="status" aria-live="polite">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Unlock the phone and approve the <span className="font-medium">Allow USB debugging?</span> prompt—or revoke old keys in Developer options and reconnect.</span>
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2">
        {device.isWifi && device.status === 'device' && (
          <button type="button" onClick={handleDisconnect} disabled={busy} className="ui-btn ui-btn-danger min-h-11 px-3 py-1.5 text-xs">
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </button>
        )}

        {device.isWifi && device.status === 'offline' && device.ip && (
          <button type="button" onClick={handleConnect} disabled={busy} className="ui-btn ui-btn-secondary min-h-11 px-3 py-1.5 text-xs">
            <PlugZap className="h-3.5 w-3.5" />
            {busy ? 'Connecting...' : 'Reconnect'}
          </button>
        )}
      </div>
    </article>
  )
}
