import { useState, useRef, type KeyboardEvent } from 'react'
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
  const tabQrRef = useRef<HTMLButtonElement>(null)
  const tabManualRef = useRef<HTMLButtonElement>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return
    if (pairing.status !== 'idle') void pairing.cancelPairing()
    setActiveTab(tab)
  }

  const onTabListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next: Tab = activeTab === 'qr' ? 'manual' : 'qr'
      switchTab(next)
      ;(next === 'qr' ? tabQrRef : tabManualRef).current?.focus()
    }
    if (e.key === 'Home') {
      e.preventDefault()
      switchTab('qr')
      tabQrRef.current?.focus()
    }
    if (e.key === 'End') {
      e.preventDefault()
      switchTab('manual')
      tabManualRef.current?.focus()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header
        title="Pair over Wi‑Fi"
        subtitle="Follow the same flow as Android’s Wireless debugging screen: QR is quickest when the phone offers it; use pairing code when only a code and port are shown."
      />

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-8 md:px-8">
        {toast && (
          <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={cn(
              'ui-banner ui-enter-soft mb-6',
              toast.type === 'success' ? 'ui-banner-success' : 'ui-banner-error'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {toast.message}
          </div>
        )}

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 md:gap-8">
          <div
            role="tablist"
            aria-label="How to pair"
            className="glass-panel-strong flex gap-1.5 rounded-2xl p-1.5"
            onKeyDown={onTabListKeyDown}
          >
            <button
              ref={tabQrRef}
              type="button"
              role="tab"
              id="tab-pair-qr"
              aria-selected={activeTab === 'qr'}
              aria-controls="panel-pair-qr"
              tabIndex={activeTab === 'qr' ? 0 : -1}
              onClick={() => switchTab('qr')}
              className={cn(
                'ui-btn ui-btn-secondary min-h-11 flex-1 text-sm',
                activeTab === 'qr' ? 'ui-btn--segment-active' : 'text-app-text-muted'
              )}
            >
              <QrCode className="h-4 w-4 shrink-0" aria-hidden />
              QR code
            </button>
            <button
              ref={tabManualRef}
              type="button"
              role="tab"
              id="tab-pair-manual"
              aria-selected={activeTab === 'manual'}
              aria-controls="panel-pair-manual"
              tabIndex={activeTab === 'manual' ? 0 : -1}
              onClick={() => switchTab('manual')}
              className={cn(
                'ui-btn ui-btn-secondary min-h-11 flex-1 text-sm',
                activeTab === 'manual' ? 'ui-btn--segment-active' : 'text-app-text-muted'
              )}
            >
              <Hash className="h-4 w-4 shrink-0" aria-hidden />
              Pairing code
            </button>
          </div>

          <div className="glass-panel-strong p-5 sm:p-6 md:p-8">
            <div
              id="panel-pair-qr"
              role="tabpanel"
              aria-labelledby="tab-pair-qr"
              hidden={activeTab !== 'qr'}
            >
              {activeTab === 'qr' && (
                <div className="ui-reveal-content">
                  <QrDisplay
                    qrDataUrl={pairing.qrDataUrl}
                    status={pairing.status}
                    stage={pairing.stage}
                    detail={pairing.detail}
                    androidIp={pairing.androidIp}
                    error={pairing.error}
                    onStart={pairing.startPairing}
                    onCancel={pairing.cancelPairing}
                  />
                </div>
              )}
            </div>
            <div
              id="panel-pair-manual"
              role="tabpanel"
              aria-labelledby="tab-pair-manual"
              hidden={activeTab !== 'manual'}
            >
              {activeTab === 'manual' && (
                <div className="ui-reveal-content">
                  <ManualPairForm onSuccess={(msg) => showToast('success', msg)} onError={(msg) => showToast('error', msg)} />
                </div>
              )}
            </div>
          </div>

          <section className="glass-panel p-5 sm:p-6 md:p-7" aria-labelledby="pair-requirements-heading">
            <h2 id="pair-requirements-heading" className="ui-overline mb-3">
              Before you start
            </h2>
            <ul className="max-w-prose space-y-2.5 text-sm leading-relaxed text-app-text-secondary">
              <li className="flex gap-2.5">
                <span className="ui-list-dot mt-1.5 shrink-0" aria-hidden />
                <span>
                  <strong className="font-medium text-app-text-primary">Android 11+</strong> — Wireless debugging is under{' '}
                  <strong className="font-medium text-app-text-primary">Developer options</strong> (enable that first if you don’t see it).
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="ui-list-dot mt-1.5 shrink-0" aria-hidden />
                <span>Phone and computer on the <strong className="font-medium text-app-text-primary">same Wi‑Fi</strong>. Guest networks and some VPNs block discovery.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="ui-list-dot mt-1.5 shrink-0" aria-hidden />
                <span>
                  On the phone: <strong className="font-medium text-app-text-primary">Settings → Developer options → Wireless debugging</strong> — leave it on while you pair.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
