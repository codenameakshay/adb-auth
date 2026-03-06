import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Server, ServerOff, Loader2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { useSettings } from '../hooks/useSettings'
import { cn } from '../lib/utils'

const INTERVALS = [
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
]

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [adbPathInput, setAdbPathInput] = useState('')
  const [adbStatus, setAdbStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [serverBusy, setServerBusy] = useState<'kill' | 'start' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setAdbPathInput(settings.adbPath || '')
  }, [settings.adbPath])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const verifyPath = async () => {
    if (!adbPathInput.trim()) return
    const result = await window.electronAPI.adb.verifyPath(adbPathInput.trim())
    if (result.success && result.data) {
      setAdbStatus('valid')
      await updateSettings({ adbPath: adbPathInput.trim() })
      showToast('ADB path saved')
    } else {
      setAdbStatus('invalid')
    }
  }

  const killServer = async () => {
    setServerBusy('kill')
    try {
      const result = await window.electronAPI.adb.killServer()
      showToast(result.success ? 'ADB server stopped' : result.error || 'Failed to stop server')
    } finally {
      setServerBusy(null)
    }
  }

  const startServer = async () => {
    setServerBusy('start')
    try {
      const result = await window.electronAPI.adb.startServer()
      showToast(result.success ? 'ADB server started' : result.error || 'Failed to start server')
    } finally {
      setServerBusy(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header title="Settings" />

      <div className="flex-1 overflow-y-auto p-6">
        {toast && (
          <div className="ui-banner ui-banner-neutral mb-4" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-5">
          <section className="glass-panel-strong space-y-3 p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">ADB Binary</h2>
            <p className="ui-help">Path to the adb binary. Auto-detected from PATH or common SDK locations.</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={adbPathInput}
                  onChange={(e) => {
                    setAdbPathInput(e.target.value)
                    setAdbStatus('idle')
                  }}
                  placeholder="/home/user/Android/Sdk/platform-tools/adb"
                  className="ui-input font-code pr-9 text-sm"
                />
                {adbStatus === 'valid' && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-green-300" />}
                {adbStatus === 'invalid' && <XCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" />}
              </div>
              <button onClick={verifyPath} className="ui-btn ui-btn-secondary sm:min-w-[108px]">
                Verify
              </button>
            </div>

            {adbStatus === 'invalid' && (
              <p className="text-xs text-red-200" role="alert">
                Could not verify this path. Make sure it points to a valid adb binary.
              </p>
            )}

            {settings.adbPath && <p className="font-code text-xs text-green-300">Current: {settings.adbPath}</p>}
          </section>

          <section className="glass-panel-strong space-y-3 p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Device Refresh Interval</h2>
            <p className="ui-help">How often the app polls for connected devices.</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INTERVALS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ refreshInterval: value })}
                  className={cn(
                    'ui-btn min-h-11 text-sm',
                    settings.refreshInterval === value ? 'ui-btn-secondary border-blue-300/35 text-white' : 'ui-btn-secondary text-[var(--text-muted)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="glass-panel-strong p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Minimize to Tray on Close</h2>
                <p className="ui-help">Keep app running in system tray after window close.</p>
              </div>
              <button
                onClick={() => updateSettings({ minimizeToTray: !settings.minimizeToTray })}
                className={cn(
                  'relative h-7 w-12 rounded-full border transition-colors duration-200',
                  settings.minimizeToTray
                    ? 'border-green-300/40 bg-green-500/40'
                    : 'border-slate-300/25 bg-slate-700/70'
                )}
                aria-label="Toggle minimize to tray"
                aria-pressed={settings.minimizeToTray}
              >
                <span
                  className={cn(
                    'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform duration-200',
                    settings.minimizeToTray ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>
          </section>

          <section className="glass-panel-strong space-y-3 p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">ADB Server</h2>
            <p className="ui-help">Control the ADB background server process.</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={killServer} disabled={!!serverBusy} className="ui-btn ui-btn-danger sm:min-w-[156px]">
                {serverBusy === 'kill' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerOff className="h-4 w-4" />}
                Kill Server
              </button>
              <button onClick={startServer} disabled={!!serverBusy} className="ui-btn ui-btn-primary sm:min-w-[156px]">
                {serverBusy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                Start Server
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
