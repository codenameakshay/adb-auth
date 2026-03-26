import { useState } from 'react'
import { useWifi } from '../../hooks/useWifi'
import { cn } from '../../lib/utils'

export function NetworkBadge() {
  const { ssid, ip, copyIp } = useWifi()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!ip) return
    copyIp()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const summary = [ssid, ip].filter(Boolean).join(' · ')
  const chipClass = 'ui-chip max-w-[min(100%,14rem)] truncate sm:max-w-none'

  if (!ssid && !ip) {
    return (
      <span
        className={chipClass}
        role="status"
        aria-live="polite"
        title="Wi‑Fi name and IP weren’t detected (permissions or adapter)"
      >
        <span className="text-app-text-faint">Network</span>
        <span className="truncate text-app-text-secondary">Unavailable</span>
      </span>
    )
  }

  const value = (
    <span
      className={cn(
        'min-w-0 truncate tabular-nums',
        copied ? 'text-app-accent-green' : 'text-app-text-secondary'
      )}
    >
      {copied ? 'Copied' : summary}
    </span>
  )

  if (!ip) {
    return (
      <span className={chipClass} role="status" aria-live="polite" title={ssid ?? undefined}>
        <span className="text-app-text-faint">Network</span>
        {value}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={chipClass}
      title={copied ? 'Copied!' : `Click to copy ${ip}`}
      aria-label={copied ? 'IP copied to clipboard' : 'Copy local IP address'}
    >
      <span className="text-app-text-faint">Network</span>
      {value}
    </button>
  )
}
