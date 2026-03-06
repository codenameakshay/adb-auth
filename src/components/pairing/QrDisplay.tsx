import { CheckCircle2, Loader2, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface QrDisplayProps {
  qrDataUrl: string | null
  status: 'idle' | 'waiting' | 'pairing' | 'success' | 'error'
  androidIp: string | null
  error: string | null
  onStart: () => void
  onCancel: () => void
}

export function QrDisplay({ qrDataUrl, status, androidIp, error, onStart, onCancel }: QrDisplayProps) {
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-slate-800/60">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div>
          <p className="mb-1 text-base font-semibold text-[var(--text-primary)]">Pair with QR Code</p>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Generate a pairing QR code, then scan it from Wireless Debugging on your Android device.
          </p>
        </div>
        <button onClick={onStart} className="ui-btn ui-btn-primary">
          Generate QR Code
        </button>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-300/35 bg-green-500/20">
          <CheckCircle2 className="h-8 w-8 text-green-300" />
        </div>
        <div>
          <p className="mb-1 text-base font-semibold text-[var(--text-primary)]">Device Paired</p>
          {androidIp && <p className="font-code text-sm text-[var(--text-secondary)]">{androidIp}</p>}
        </div>
        <button onClick={onStart} className="ui-btn ui-btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" />
          Pair Another Device
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-300/35 bg-red-500/20">
          <XCircle className="h-8 w-8 text-red-200" />
        </div>
        <div>
          <p className="mb-1 text-base font-semibold text-[var(--text-primary)]">Pairing Failed</p>
          <p className="max-w-xs text-sm text-[var(--text-secondary)]">{error || 'An unknown error occurred'}</p>
        </div>
        <button onClick={onStart} className="ui-btn ui-btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-7 py-2 md:py-3">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 transition-all duration-200',
          status === 'waiting'
            ? 'border-green-300/55 shadow-[0_0_28px_rgba(34,197,94,0.24)]'
            : 'border-blue-300/55 shadow-[0_0_28px_rgba(96,165,250,0.22)]'
        )}
      >
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="ADB pairing QR code" className="h-64 w-64 rounded-xl bg-white object-contain md:h-72 md:w-72" />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center bg-slate-900 md:h-72 md:w-72">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        )}

        {status === 'waiting' && <div className="absolute inset-0 animate-pulse border-2 border-green-300/35 rounded-2xl" />}

        {status === 'pairing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55">
            <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
            <p className="text-sm font-semibold text-white">Pairing...</p>
          </div>
        )}
      </div>

      <div className="max-w-md text-center">
        {status === 'waiting' && (
          <>
            <p className="mb-1.5 text-2xl font-semibold text-[var(--text-primary)]">Waiting for Android device scan...</p>
            <p className="text-sm text-[var(--text-muted)]">
              Open Wireless Debugging on phone and select Pair device with QR code.
            </p>
          </>
        )}
        {status === 'pairing' && <p className="text-sm text-blue-200">Completing pairing handshake...</p>}
      </div>

      <button onClick={onCancel} className="ui-btn ui-btn-secondary min-h-10 px-5 text-xs">
        Cancel
      </button>
    </div>
  )
}
