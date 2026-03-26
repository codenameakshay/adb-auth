import { lazy, Suspense, useMemo } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { DevicesProvider, useDevicesContext } from './context/DevicesProvider'
import { useSettings } from './hooks/useSettings'
import type { AppSettings } from '../shared/types'

const DevicesPage = lazy(() => import('./pages/DevicesPage').then((m) => ({ default: m.DevicesPage })))
const PairPage = lazy(() => import('./pages/PairPage').then((m) => ({ default: m.PairPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-2 px-4" role="status" aria-live="polite">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-app-text-faint border-t-app-accent-blue-mid" aria-hidden />
      <span className="text-sm text-app-text-muted">Loading…</span>
    </div>
  )
}

function AppShell({ settings }: { settings: AppSettings }) {
  const { devices } = useDevicesContext()
  const connectedCount = useMemo(() => devices.filter((d) => d.status === 'device').length, [devices])

  return (
    <div className="app-shell relative flex h-screen w-screen overflow-hidden p-2 sm:p-2.5 md:p-3.5">
      {/* Decorative glow layers */}
      <div aria-hidden className="ui-deco-glow ui-deco-glow--blue" />
      <div aria-hidden className="ui-deco-glow ui-deco-glow--green" />

      {/* Skip link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] ui-btn ui-btn-secondary">
        Skip to main content
      </a>

      {/* Title bar drag area */}
      <div
        className="fixed left-0 right-0 top-0 z-50 h-8 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <Sidebar />

      <div className="relative z-10 ml-2 flex min-w-0 flex-1 flex-col overflow-hidden pt-8 sm:ml-2.5 md:ml-3.5">
        <main id="main-content" className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<DevicesPage />} />
              <Route path="/pair" element={<PairPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>

          <StatusBar adbPath={settings.adbPath} deviceCount={connectedCount} />
        </main>
      </div>
    </div>
  )
}

function AppContent() {
  const { settings } = useSettings()

  return (
    <DevicesProvider refreshInterval={settings.refreshInterval}>
      <AppShell settings={settings} />
    </DevicesProvider>
  )
}

export function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
