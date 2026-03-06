import { useState, type FormEvent } from 'react'
import { PlugZap, Loader2 } from 'lucide-react'

interface ManualPairFormProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function ManualPairForm({ onSuccess, onError }: ManualPairFormProps) {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const [debugPort, setDebugPort] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ip || !port || !code) return

    setBusy(true)
    try {
      const pairResult = await window.electronAPI.adb.pair(ip, parseInt(port, 10), code)
      if (!pairResult.success) {
        onError(pairResult.error || 'Pairing failed')
        return
      }

      if (debugPort.trim()) {
        const connectResult = await window.electronAPI.adb.connect(ip, parseInt(debugPort.trim(), 10))
        if (!connectResult.success) {
          onError(connectResult.error || 'Paired, but failed to connect using debug port')
          return
        }
        onSuccess(connectResult.data || 'Device paired and connected')
        return
      }

      const autoConnect = await window.electronAPI.adb.autoConnect(ip)
      if (!autoConnect.success) {
        onError(
          autoConnect.error ||
          'Paired, but could not auto-connect. Enter the debug port from your phone and try again.'
        )
        return
      }

      onSuccess(autoConnect.data || 'Device paired and connected')
    } catch (err) {
      onError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Manual pairing form">
      <p className="text-sm text-[var(--text-secondary)]">
        On your phone, open Developer Options, enable Wireless Debugging, and choose Pair device with pairing code.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="ui-label" htmlFor="pair-ip">
            IP Address
          </label>
          <input
            id="pair-ip"
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.100"
            className="ui-input font-code text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="ui-label" htmlFor="pair-port">
            Pairing Port
          </label>
          <input
            id="pair-port"
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="37185"
            className="ui-input font-code text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="ui-label" htmlFor="pair-code">
          Pairing Code (6 digits)
        </label>
        <input
          id="pair-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          maxLength={6}
          className="ui-input font-code text-center text-2xl tracking-[0.3em]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="ui-label" htmlFor="debug-port">
          Debug Port (optional but recommended)
        </label>
        <input
          id="debug-port"
          type="text"
          value={debugPort}
          onChange={(e) => setDebugPort(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 37147 from Wireless Debugging"
          className="ui-input font-code text-sm"
        />
      </div>

      <button type="submit" disabled={busy || !ip || !port || code.length !== 6} className="ui-btn ui-btn-primary w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Pairing...
          </>
        ) : (
          <>
            <PlugZap className="h-4 w-4" />
            Pair Device
          </>
        )}
      </button>
    </form>
  )
}
