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
        device.status === 'device' ? 'border-green-300/20' : 'border-white/10'
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border',
          device.isWifi
            ? 'border-blue-300/25 bg-blue-500/15 text-blue-200'
            : 'border-slate-300/20 bg-slate-700/40 text-slate-200'
        )}
      >
        {device.isWifi ? <Wifi className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</h3>
          <DeviceStatusBadge status={device.status} />
        </div>

        <button
          onClick={copySerial}
          className="group flex min-h-9 items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          aria-label="Copy device serial"
        >
          {copied ? <span className="text-green-300">Copied serial</span> : <span className="font-code">{device.serial}</span>}
          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-80" />
        </button>

        {device.isWifi && device.ip && (
          <p className="font-code text-xs text-[var(--text-faint)]">
            {device.ip}:{device.port}
          </p>
        )}

        {device.status === 'unauthorized' && (
          <p className="mt-2 flex items-center gap-1 text-xs text-yellow-200" role="status" aria-live="polite">
            <AlertTriangle className="h-3.5 w-3.5" />
            USB debugging authorization is required on the phone.
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col gap-2">
        {device.isWifi && device.status === 'device' && (
          <button onClick={handleDisconnect} disabled={busy} className="ui-btn ui-btn-danger min-h-10 px-3 py-1.5 text-xs">
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </button>
        )}

        {device.isWifi && device.status === 'offline' && device.ip && (
          <button onClick={handleConnect} disabled={busy} className="ui-btn ui-btn-secondary min-h-10 px-3 py-1.5 text-xs">
            <PlugZap className="h-3.5 w-3.5" />
            {busy ? 'Connecting...' : 'Reconnect'}
          </button>
        )}
      </div>
    </article>
  )
}
