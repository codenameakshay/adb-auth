import { useState, type FormEvent } from 'react'
import { PlugZap, Loader2 } from 'lucide-react'

interface ManualPairFormProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function ManualPairForm({ onSuccess, onError }: ManualPairFormProps) {
  const [ip, setIp] = useState('')
  const [port, setPort] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ip || !port || !code) return

    setBusy(true)
    try {
      // Step 1: Pair
      const pairResult = await window.electronAPI.adb.pair(ip, parseInt(port, 10), code)
      if (!pairResult.success) {
        onError(pairResult.error || 'Pairing failed')
        return
      }

      // Step 2: Connect (different port for debugging)
      // The debug port is typically different from the pairing port
      // After pairing, the device will appear in adb devices
      onSuccess(pairResult.data || 'Device paired successfully')
    } catch (err) {
      onError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-neutral-400">
        On your phone: Developer Options → Wireless Debugging → Pair device with pairing code.
        Enter the IP, port, and 6-digit code shown on your phone.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 mb-1.5 block">IP Address</label>
          <input
            type="text"
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1.5 block">Pairing Port</label>
          <input
            type="text"
            value={port}
            onChange={e => setPort(e.target.value)}
            placeholder="37185"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-500 mb-1.5 block">Pairing Code (6 digits)</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          maxLength={6}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono text-2xl tracking-[0.3em] text-center"
        />
      </div>

      <button
        type="submit"
        disabled={busy || !ip || !port || code.length !== 6}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Pairing...</>
        ) : (
          <><PlugZap className="w-4 h-4" />Pair Device</>
        )}
      </button>
    </form>
  )
}
