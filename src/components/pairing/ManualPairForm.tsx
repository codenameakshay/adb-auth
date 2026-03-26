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
        onError(pairResult.error || 'Pairing didn’t finish. Check the IP, pairing port, and code, then try again.')
        return
      }

      if (debugPort.trim()) {
        const connectResult = await window.electronAPI.adb.connect(ip, parseInt(debugPort.trim(), 10))
        if (!connectResult.success) {
          onError(
            connectResult.error ||
              'Pairing worked, but connecting on the debug port failed. Confirm the debug port on the phone’s Wireless debugging screen.'
          )
          return
        }
        onSuccess(connectResult.data || 'Paired and connected.')
        return
      }

      const autoConnect = await window.electronAPI.adb.autoConnect(ip)
      if (!autoConnect.success) {
        onError(
          autoConnect.error ||
            'Pairing worked, but we couldn’t connect automatically. Copy the debug port from Wireless debugging (main screen), paste it below, and try again.'
        )
        return
      }

      onSuccess(autoConnect.data || 'Paired and connected.')
    } catch (err) {
      onError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Pair with pairing code">
      <p className="text-sm leading-relaxed text-app-text-secondary">
        On the phone open <strong className="font-medium text-app-text-primary">Pair device with pairing code</strong> (under{' '}
        <strong className="font-medium text-app-text-primary">Settings → Developer options → Wireless debugging</strong>). Copy the{' '}
        <strong className="font-medium text-app-text-primary">IP address</strong>, <strong className="font-medium text-app-text-primary">pairing port</strong>, and{' '}
        <strong className="font-medium text-app-text-primary">pairing code</strong> into the fields below—they must match the phone exactly.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="ui-label" htmlFor="pair-ip">
            Phone IP address
          </label>
          <input
            id="pair-ip"
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.100"
            className="ui-input font-code text-sm"
            autoComplete="off"
            aria-describedby="pair-ip-hint"
          />
          <p id="pair-ip-hint" className="text-xs text-app-text-faint">
            The IPv4 address shown on the pairing screen (same Wi‑Fi as this computer).
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="ui-label" htmlFor="pair-port">
            Pairing port
          </label>
          <input
            id="pair-port"
            type="text"
            inputMode="numeric"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="37185"
            className="ui-input font-code text-sm"
            aria-describedby="pair-port-hint"
          />
          <p id="pair-port-hint" className="text-xs text-app-text-faint">
            The port next to the pairing code—not the main “debug” port yet.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="ui-label" htmlFor="pair-code">
          Six-digit pairing code
        </label>
        <input
          id="pair-code"
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="ui-input font-code text-center text-2xl tracking-[0.3em]"
          aria-describedby="pair-code-hint"
        />
        <p id="pair-code-hint" className="text-xs text-app-text-faint">
          From the phone’s pairing dialog; digits only.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="ui-label" htmlFor="debug-port">
          Debug port <span className="font-normal text-app-text-faint">(recommended)</span>
        </label>
        <input
          id="debug-port"
          type="text"
          inputMode="numeric"
          value={debugPort}
          onChange={(e) => setDebugPort(e.target.value.replace(/\D/g, ''))}
          placeholder="Shown under Wireless debugging (IP & port)"
          className="ui-input font-code text-sm"
          aria-describedby="debug-port-hint"
        />
        <p id="debug-port-hint" className="text-xs text-app-text-faint">
          From the main Wireless debugging page after pairing—helps when automatic connect can’t find the device.
        </p>
      </div>

      <button type="submit" disabled={busy || !ip || !port || code.length !== 6} className="ui-btn ui-btn-primary w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Pairing…
          </>
        ) : (
          <>
            <PlugZap className="h-4 w-4" aria-hidden />
            Pair and connect
          </>
        )}
      </button>
    </form>
  )
}
