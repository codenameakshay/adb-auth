import { useState } from 'react'
import { X, QrCode, RefreshCw, FolderCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dismissQuickStart, isQuickStartDismissed } from '../../lib/onboardingStorage'

export function QuickStartBanner() {
  const [visible, setVisible] = useState(() => !isQuickStartDismissed())
  const navigate = useNavigate()

  const close = () => {
    dismissQuickStart()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <section className="glass-panel mb-6 p-4 sm:p-5" role="region" aria-label="Quick start">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-app-text-primary">Quick start</h2>
          <p className="ui-help mt-1 max-w-prose">
            Three steps to your first wireless session. Dismiss anytime—you can always use the sidebar.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg p-2 text-app-text-faint transition-colors hover:bg-[var(--surface-hover-faint)] hover:text-app-text-secondary"
          aria-label="Dismiss quick start"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <ol className="min-w-0 flex-1 list-none space-y-2.5 p-0 text-sm leading-relaxed text-app-text-secondary">
          <li className="flex gap-2.5">
            <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-app-accent-blue" aria-hidden />
            <span>
              Open <strong className="font-medium text-app-text-primary">Pair</strong>, then on the phone enable{' '}
              <strong className="font-medium text-app-text-primary">Wireless debugging</strong> and scan the QR code (or use the{' '}
              <strong className="font-medium text-app-text-primary">Pairing code</strong> tab).
            </span>
          </li>
          <li className="flex gap-2.5">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-app-accent-blue" aria-hidden />
            <span>
              Return to <strong className="font-medium text-app-text-primary">Devices</strong> and choose{' '}
              <strong className="font-medium text-app-text-primary">Refresh list</strong> if something just connected.
            </span>
          </li>
          <li className="flex gap-2.5">
            <FolderCog className="mt-0.5 h-4 w-4 shrink-0 text-app-accent-blue" aria-hidden />
            <span>
              If the footer says ADB isn’t found, set the path to your{' '}
              <span className="font-code text-[length:inherit]">platform-tools/adb</span> under{' '}
              <strong className="font-medium text-app-text-primary">Settings</strong>, then refresh the list.
            </span>
          </li>
        </ol>
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={() => {
              close()
              navigate('/settings')
            }}
            className="ui-btn ui-btn-secondary min-h-11 flex-1 text-xs sm:flex-none sm:text-sm"
          >
            Open Settings
          </button>
          <button type="button" onClick={close} className="ui-btn ui-btn-primary min-h-11 flex-1 sm:flex-none sm:text-sm">
            Got it, thanks
          </button>
        </div>
      </div>
    </section>
  )
}
