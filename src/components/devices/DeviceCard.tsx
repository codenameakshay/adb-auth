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
    try { await onConnect(device.ip, device.port) } finally { setBusy(false) }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try { await onDisconnect(device.serial) } finally { setBusy(false) }
  }

  const displayName = device.model?.replace(/_/g, ' ') || 'Unknown Device'

  return (
    <div className={cn(
      'bg-neutral-900 border rounded-xl p-4 flex items-start gap-4 transition-colors',
      device.status === 'device' ? 'border-neutral-800 hover:border-neutral-700' : 'border-neutral-800/60 opacity-75'
    )}>
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        device.isWifi ? 'bg-blue-500/15' : 'bg-neutral-800'
      )}>
        {device.isWifi
          ? <Wifi className="w-5 h-5 text-blue-400" />
          : <Smartphone className="w-5 h-5 text-neutral-400" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white truncate">{displayName}</span>
          <DeviceStatusBadge status={device.status} />
        </div>

        <button
          onClick={copySerial}
          className="text-xs text-neutral-500 font-mono hover:text-neutral-300 transition-colors flex items-center gap-1 group"
        >
          {copied ? <span className="text-green-400">Copied!</span> : device.serial}
          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>

        {device.isWifi && device.ip && (
          <p className="text-xs text-neutral-600 mt-0.5 font-mono">{device.ip}:{device.port}</p>
        )}

        {device.status === 'unauthorized' && (
          <p className="text-xs text-yellow-500/80 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Check phone for USB debugging prompt
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {device.isWifi && device.status === 'device' && (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-500/15 hover:text-red-400 text-neutral-400 transition-colors disabled:opacity-50"
          >
            <Unplug className="w-3.5 h-3.5" />
            Disconnect
          </button>
        )}

        {device.isWifi && device.status === 'offline' && device.ip && (
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors disabled:opacity-50"
          >
            <PlugZap className="w-3.5 h-3.5" />
            {busy ? 'Connecting...' : 'Reconnect'}
          </button>
        )}
      </div>
    </div>
  )
}
