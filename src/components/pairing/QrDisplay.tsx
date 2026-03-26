import { CheckCircle2, Loader2, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface QrDisplayProps {
  qrDataUrl: string | null
  status: 'idle' | 'waiting' | 'pairing' | 'connecting' | 'success' | 'error'
  stage?: 'waiting_for_scan' | 'waiting_for_pairing_service' | 'pairing' | 'waiting_for_connect_service' | 'connecting' | 'success' | 'error'
  detail: string | null
  androidIp: string | null
  error: string | null
  onStart: () => void
  onCancel: () => void
}

export function QrDisplay({ qrDataUrl, status, stage, detail, androidIp, error, onStart, onCancel }: QrDisplayProps) {
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 text-center sm:py-12">
        <div className="ui-icon-well ui-icon-well--md ui-icon-well--muted-strong rounded-2xl">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-app-icon-muted" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold text-app-text-primary">Pair with a QR code</p>
          <p className="text-sm leading-relaxed text-app-text-secondary">
            Tap below to generate a QR code. On the phone open <span className="text-app-text-primary">Wireless debugging</span>, choose{' '}
            <span className="text-app-text-primary">Pair device with QR code</span>, and scan the square.
          </p>
        </div>
        <button type="button" onClick={onStart} className="ui-btn ui-btn-primary">
          Show pairing QR code
        </button>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 text-center sm:py-12">
        <div className="ui-icon-tile ui-icon-tile--lg ui-icon-tile--round ui-icon-tile--success">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <div className="max-w-sm space-y-1">
          <p className="text-base font-semibold text-app-text-primary">Paired successfully</p>
          {androidIp && <p className="font-code text-sm text-app-text-secondary">{androidIp}</p>}
          <p className="text-sm text-app-text-muted">
            Open <strong className="font-medium text-app-text-secondary">Devices</strong> and use <strong className="font-medium text-app-text-secondary">Refresh list</strong> if it does not appear as connected yet.
          </p>
        </div>
        <button type="button" onClick={onStart} className="ui-btn ui-btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Pair another device
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 text-center sm:py-12">
        <div className="ui-icon-tile ui-icon-tile--lg ui-icon-tile--round ui-icon-tile--danger">
          <XCircle className="h-8 w-8" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold text-app-text-primary">Pairing didn’t complete</p>
          <p className="text-sm leading-relaxed text-app-text-secondary">
            {error ||
              'Check that both devices are on the same Wi‑Fi, Wireless debugging is on, and you scanned the current QR code. Then try again.'}
          </p>
        </div>
        <button type="button" onClick={onStart} className="ui-btn ui-btn-secondary">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-2 sm:gap-7 md:py-3">
      <div
        className={cn(
          'ui-qr-frame rounded-2xl',
          status === 'waiting' ? 'ui-qr-frame--waiting' : 'ui-qr-frame--idle'
        )}
      >
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Scan with your phone to pair wireless debugging" className="h-64 w-64 rounded-xl bg-white object-contain sm:h-72 sm:w-72" />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center bg-[var(--surface-qr-loading)] sm:h-72 sm:w-72">
            <Loader2 className="h-8 w-8 animate-spin text-app-icon-muted" aria-hidden />
          </div>
        )}

        {status === 'waiting' && <div className="ui-qr-pulse-overlay animate-pulse rounded-2xl" />}

        {(status === 'pairing' || status === 'connecting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--overlay-scrim)]">
            <Loader2 className="h-8 w-8 animate-spin text-app-accent-blue-mid" aria-hidden />
            <p className="text-sm font-semibold text-app-text-primary">
              {status === 'connecting' ? 'Connecting to your phone…' : 'Finishing pairing…'}
            </p>
          </div>
        )}
      </div>

      <div className="max-w-md px-1 text-center">
        {status === 'waiting' && (
          <>
            <p className="mb-2 text-xl font-semibold leading-snug text-app-text-primary sm:text-2xl">
              {stage === 'waiting_for_connect_service'
                ? 'Waiting for the debug port…'
                : 'Waiting for you to scan…'}
            </p>
            <p className="text-sm leading-relaxed text-app-text-muted">
              {detail ||
                'On the phone: Wireless debugging → Pair device with QR code, then point the camera at the square above.'}
            </p>
          </>
        )}
        {status === 'pairing' && (
          <p className="text-sm leading-relaxed text-app-accent-blue">{detail || 'Talking to your phone—almost there.'}</p>
        )}
        {status === 'connecting' && (
          <p className="text-sm leading-relaxed text-app-accent-blue">{detail || 'Opening the wireless debug connection…'}</p>
        )}
      </div>

      <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary min-h-11 px-5 text-xs">
        Cancel pairing
      </button>
    </div>
  )
}
