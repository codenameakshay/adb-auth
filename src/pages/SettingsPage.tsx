import { useState, useEffect } from 'react'
import { FolderOpen, CheckCircle2, XCircle, Server, ServerOff, Loader2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { useSettings } from '../hooks/useSettings'
import { cn } from '../lib/utils'

const INTERVALS = [
  { label: '2 seconds', value: 2000 },
  { label: '3 seconds', value: 3000 },
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
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

  const browsePath = async () => {
    // We'll use a workaround via IPC since dialog requires main process
    // For now just allow manual input
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Settings" />

      <div className="flex-1 overflow-y-auto p-6">
        {toast && (
          <div className="mb-4 p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300">
            {toast}
          </div>
        )}

        <div className="max-w-lg space-y-6">
          {/* ADB Path */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-1">ADB Binary</h2>
            <p className="text-xs text-neutral-500 mb-3">
              Path to adb.exe. Detected automatically from PATH, Android Studio, or Scoop.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={adbPathInput}
                  onChange={e => { setAdbPathInput(e.target.value); setAdbStatus('idle') }}
                  placeholder="C:\Users\...\platform-tools\adb.exe"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono pr-8"
                />
                {adbStatus === 'valid' && (
                  <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
                {adbStatus === 'invalid' && (
                  <XCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                )}
              </div>
              <button
                onClick={verifyPath}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
              >
                Verify
              </button>
            </div>

            {adbStatus === 'invalid' && (
              <p className="text-xs text-red-400 mt-1.5">
                Could not verify this path. Make sure it points to a valid adb.exe.
              </p>
            )}

            {settings.adbPath && (
              <p className="text-xs text-green-500 mt-1.5 font-mono truncate">
                ✓ {settings.adbPath}
              </p>
            )}
          </section>

          {/* Refresh interval */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-1">Device Refresh Interval</h2>
            <p className="text-xs text-neutral-500 mb-3">How often to poll for connected devices.</p>

            <div className="grid grid-cols-4 gap-2">
              {INTERVALS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ refreshInterval: value })}
                  className={cn(
                    'py-2 rounded-lg text-sm border transition-colors',
                    settings.refreshInterval === value
                      ? 'bg-neutral-800 border-neutral-600 text-white font-medium'
                      : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Minimize to tray */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white mb-0.5">Minimize to Tray on Close</h2>
                <p className="text-xs text-neutral-500">Keep app running in system tray when window is closed.</p>
              </div>
              <button
                onClick={() => updateSettings({ minimizeToTray: !settings.minimizeToTray })}
                className={cn(
                  'relative w-10 h-6 rounded-full transition-colors',
                  settings.minimizeToTray ? 'bg-green-600' : 'bg-neutral-700'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.minimizeToTray ? 'left-5' : 'left-1'
                )} />
              </button>
            </div>
          </section>

          {/* ADB Server controls */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-1">ADB Server</h2>
            <p className="text-xs text-neutral-500 mb-3">Control the ADB background server process.</p>

            <div className="flex gap-2">
              <button
                onClick={killServer}
                disabled={!!serverBusy}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {serverBusy === 'kill' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ServerOff className="w-4 h-4" />}
                Kill Server
              </button>
              <button
                onClick={startServer}
                disabled={!!serverBusy}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {serverBusy === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                Start Server
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
