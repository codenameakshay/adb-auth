import { useState } from 'react'
import { QrCode, Hash, CheckCircle2, XCircle } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { QrDisplay } from '../components/pairing/QrDisplay'
import { ManualPairForm } from '../components/pairing/ManualPairForm'
import { usePairing } from '../hooks/usePairing'
import { cn } from '../lib/utils'

type Tab = 'qr' | 'manual'

interface Toast {
  type: 'success' | 'error'
  message: string
}

export function PairPage() {
  const [activeTab, setActiveTab] = useState<Tab>('qr')
  const [toast, setToast] = useState<Toast | null>(null)
  const pairing = usePairing()

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header title="Pair Device" />

      <div className="flex-1 overflow-y-auto p-6">
        {toast && (
          <div
            role="alert"
            className={cn(
              'ui-banner mb-4',
              toast.type === 'success' ? 'ui-banner-success' : 'ui-banner-error'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {toast.message}
          </div>
        )}

        <div className="mx-auto max-w-2xl">
          <div className="glass-panel-strong mb-5 flex gap-1 rounded-2xl p-1.5">
            <button
              onClick={() => {
                setActiveTab('qr')
                if (pairing.status !== 'idle') pairing.cancelPairing()
              }}
              className={cn(
                'ui-btn min-h-11 flex-1 text-sm',
                activeTab === 'qr' ? 'ui-btn-secondary border-blue-300/30 text-white' : 'text-[var(--text-muted)]'
              )}
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </button>
            <button
              onClick={() => {
                setActiveTab('manual')
                if (pairing.status !== 'idle') pairing.cancelPairing()
              }}
              className={cn(
                'ui-btn min-h-11 flex-1 text-sm',
                activeTab === 'manual' ? 'ui-btn-secondary border-blue-300/30 text-white' : 'text-[var(--text-muted)]'
              )}
            >
              <Hash className="h-4 w-4" />
              Pairing Code
            </button>
          </div>

          <div className="glass-panel-strong p-6">
            {activeTab === 'qr' ? (
              <QrDisplay
                qrDataUrl={pairing.qrDataUrl}
                status={pairing.status}
                androidIp={pairing.androidIp}
                error={pairing.error}
                onStart={pairing.startPairing}
                onCancel={pairing.cancelPairing}
              />
            ) : (
              <ManualPairForm onSuccess={(msg) => showToast('success', msg)} onError={(msg) => showToast('error', msg)} />
            )}
          </div>

          <section className="glass-panel mt-4 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Requirements</h2>
            <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
              <li>Android 11 or later</li>
              <li>Phone and computer on the same Wi-Fi network</li>
              <li>Developer Options with Wireless Debugging enabled</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
