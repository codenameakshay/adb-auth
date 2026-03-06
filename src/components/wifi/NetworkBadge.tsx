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
      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
        <WifiOff className="w-3.5 h-3.5" />
        <span>No WiFi</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors group"
      title={copied ? 'Copied!' : `Click to copy ${ip}`}
    >
      <Wifi className="w-3.5 h-3.5 text-green-500" />
      {ssid && <span className="text-neutral-300">{ssid}</span>}
      {ssid && ip && <span className="text-neutral-600">·</span>}
      {ip && (
        <span className={cn('font-mono', copied ? 'text-green-400' : '')}>
          {copied ? 'Copied!' : ip}
        </span>
      )}
      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  )
}
