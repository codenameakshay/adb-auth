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
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">Pair with QR Code</p>
          <p className="text-neutral-400 text-sm max-w-xs">
            Generate a QR code and scan it with your Android device in Wireless Debugging settings.
          </p>
        </div>
        <button
          onClick={onStart}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Generate QR Code
        </button>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">Device Paired!</p>
          {androidIp && (
            <p className="text-neutral-400 text-sm font-mono">{androidIp}</p>
          )}
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Pair Another Device
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">Pairing Failed</p>
          <p className="text-neutral-400 text-sm max-w-xs">{error || 'An unknown error occurred'}</p>
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code */}
      <div className={cn(
        'relative rounded-2xl overflow-hidden border-2 transition-all duration-300',
        status === 'waiting' ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      )}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="ADB pairing QR code"
            className="w-64 h-64 object-contain bg-white"
          />
        ) : (
          <div className="w-64 h-64 bg-neutral-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
          </div>
        )}

        {/* Animated border for waiting state */}
        {status === 'waiting' && (
          <div className="absolute inset-0 border-2 border-green-500/30 rounded-2xl animate-pulse" />
        )}

        {/* Overlay for pairing state */}
        {status === 'pairing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-white text-sm font-medium">Pairing...</p>
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center">
        {status === 'waiting' && (
          <>
            <p className="text-white text-sm font-medium mb-1">Waiting for Android to scan...</p>
            <p className="text-neutral-500 text-xs">
              On your phone: Developer Options → Wireless Debugging → Pair device with QR code
            </p>
          </>
        )}
        {status === 'pairing' && (
          <p className="text-blue-400 text-sm">Completing pairing handshake...</p>
        )}
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
