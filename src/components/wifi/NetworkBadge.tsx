import { Wifi, WifiOff, Copy } from 'lucide-react'
import { useWifi } from '../../hooks/useWifi'
import { cn } from '../../lib/utils'
import { useState } from 'react'

export function NetworkBadge() {
  const { ssid, ip, copyIp } = useWifi()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    copyIp()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!ssid && !ip) {
    return (
      <div className="ui-chip" role="status" aria-live="polite">
        <WifiOff className="h-3.5 w-3.5" />
        <span>No Wi-Fi</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="ui-chip group min-h-10 border-blue-200/25 bg-blue-500/10 hover:bg-blue-500/15"
      title={copied ? 'Copied!' : `Copy ${ip}`}
      aria-label={copied ? 'IP copied to clipboard' : 'Copy local IP address'}
    >
      <Wifi className="h-3.5 w-3.5 text-green-300" />
      {ssid && <span className="max-w-[120px] truncate text-[var(--text-secondary)]">{ssid}</span>}
      {ssid && ip && <span className="text-[var(--text-faint)]">•</span>}
      {ip && (
        <span className={cn('font-code', copied ? 'text-green-300' : 'text-blue-200')}>
          {copied ? 'Copied!' : ip}
        </span>
      )}
      <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-80" />
    </button>
  )
}
