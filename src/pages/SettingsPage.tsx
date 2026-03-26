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
      showToast('ADB path saved. The footer should show Found after the next refresh.')
    } else {
      setAdbStatus('invalid')
    }
  }

  const killServer = async () => {
    setServerBusy('kill')
    try {
      const result = await window.electronAPI.adb.killServer()
      showToast(
        result.success
          ? 'ADB server stopped. Start it again if devices stop responding.'
          : result.error || 'Could not stop the ADB server. Try again or restart the app.'
      )
    } finally {
      setServerBusy(null)
    }
  }

  const startServer = async () => {
    setServerBusy('start')
    try {
      const result = await window.electronAPI.adb.startServer()
      showToast(
        result.success
          ? 'ADB server is running again.'
          : result.error || 'Could not start the ADB server. Check the path above.'
      )
    } finally {
      setServerBusy(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header
        title="Settings"
        subtitle="All local: path to adb, how often the device list refreshes, tray behavior, and starting or stopping the background ADB server."
      />

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-8">
        {toast && (
          <div className="ui-banner ui-banner-neutral ui-enter-soft mb-6" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-6 sm:gap-8">
          <section className="glass-panel-strong space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-app-text-primary">ADB executable</h2>
              <p className="ui-help mt-1">
                Full path to the <span className="font-code text-[length:inherit]">adb</span> executable inside Android <strong className="font-medium text-app-text-secondary">platform-tools</strong>. Leave blank if{' '}
                <span className="font-code text-[length:inherit]">adb</span> already works in a terminal (we still probe common SDK locations).
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={adbPathInput}
                  onChange={(e) => {
                    setAdbPathInput(e.target.value)
                    setAdbStatus('idle')
                  }}
                  placeholder="/home/you/Android/Sdk/platform-tools/adb"
                  className="ui-input font-code pr-9 text-sm"
                  aria-describedby="adb-path-hint"
                />
                {adbStatus === 'valid' && (
                  <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-accent-green" aria-hidden />
                )}
                {adbStatus === 'invalid' && (
                  <XCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-danger" aria-hidden />
                )}
              </div>
              <button type="button" onClick={verifyPath} className="ui-btn ui-btn-secondary shrink-0 sm:min-w-[7.5rem]">
                Check and save
              </button>
            </div>

            <p id="adb-path-hint" className="text-xs text-app-text-faint">
              Example on Windows: <span className="font-code">C:\Users\You\AppData\Local\Android\Sdk\platform-tools\adb.exe</span>
            </p>

            {adbStatus === 'invalid' && (
              <p className="text-sm text-app-danger" role="alert">
                That path doesn’t look like a working adb. Double-check the file exists and that you can run it in a terminal.
              </p>
            )}

            {settings.adbPath && (
              <p className="font-code text-xs text-app-accent-green">
                Saved: {settings.adbPath}
              </p>
            )}
          </section>

          <section className="glass-panel-strong space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-app-text-primary">Device list refresh</h2>
              <p className="ui-help mt-1">
                How often to poll ADB for the device list. Shorter is snappier; longer is a bit easier on CPU.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INTERVALS.map(({ label, value }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => updateSettings({ refreshInterval: value })}
                  className={cn(
                    'ui-btn ui-btn-secondary min-h-11 text-sm',
                    settings.refreshInterval === value ? 'ui-btn--segment-active' : 'text-app-text-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="glass-panel-strong p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-sm font-semibold text-app-text-primary">Close window → keep running in tray</h2>
                <p className="ui-help">When on, closing the window keeps the app running in the system tray instead of exiting.</p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ minimizeToTray: !settings.minimizeToTray })}
                className={cn(
                  'ui-toggle-track self-start sm:self-center',
                  settings.minimizeToTray ? 'ui-toggle-track--on' : 'ui-toggle-track--off'
                )}
                aria-label="Run in system tray when the window is closed"
                aria-pressed={settings.minimizeToTray}
              >
                <span className="ui-toggle-thumb" />
              </button>
            </div>
          </section>

          <section className="glass-panel-strong space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-app-text-primary">ADB background server</h2>
              <p className="ui-help mt-1">
                adb runs a small background server. Stop it to clear odd state; start it again if terminals or this app stop seeing devices.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={killServer} disabled={!!serverBusy} className="ui-btn ui-btn-danger sm:min-w-[10rem]">
                {serverBusy === 'kill' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ServerOff className="h-4 w-4" aria-hidden />}
                Stop server
              </button>
              <button type="button" onClick={startServer} disabled={!!serverBusy} className="ui-btn ui-btn-primary sm:min-w-[10rem]">
                {serverBusy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Server className="h-4 w-4" aria-hidden />}
                Start server
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
