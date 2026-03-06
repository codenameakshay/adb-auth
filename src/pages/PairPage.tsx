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
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Pair Device" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toast */}
        {toast && (
          <div className={cn(
            'mb-4 p-3 rounded-lg border text-sm flex items-center gap-2',
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          )}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <XCircle className="w-4 h-4 flex-shrink-0" />
            }
            {toast.message}
          </div>
        )}

        <div className="max-w-lg mx-auto">
          {/* Tabs */}
          <div className="flex bg-neutral-900 rounded-xl p-1 gap-1 mb-6">
            <button
              onClick={() => {
                setActiveTab('qr')
                if (pairing.status !== 'idle') pairing.cancelPairing()
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'qr'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
            <button
              onClick={() => {
                setActiveTab('manual')
                if (pairing.status !== 'idle') pairing.cancelPairing()
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'manual'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Hash className="w-4 h-4" />
              Pairing Code
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
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
              <ManualPairForm
                onSuccess={msg => showToast('success', msg)}
                onError={msg => showToast('error', msg)}
              />
            )}
          </div>

          {/* Help text */}
          <div className="mt-4 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
            <p className="text-xs font-medium text-neutral-400 mb-2">Requirements</p>
            <ul className="text-xs text-neutral-600 space-y-1">
              <li>• Android 11 or later</li>
              <li>• Both devices on the same WiFi network</li>
              <li>• Developer Options → Wireless Debugging → enabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
