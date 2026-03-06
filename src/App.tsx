import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { DevicesPage } from './pages/DevicesPage'
import { PairPage } from './pages/PairPage'
import { SettingsPage } from './pages/SettingsPage'
import { useDevices } from './hooks/useDevices'
import { useSettings } from './hooks/useSettings'

function AppContent() {
  const { settings } = useSettings()
  const { devices } = useDevices(settings.refreshInterval)
  const connectedCount = devices.filter((d) => d.status === 'device').length

  return (
    <div className="app-shell relative flex h-screen w-screen overflow-hidden select-none p-3">
      {/* Decorative glow layers */}
      <div aria-hidden className="pointer-events-none absolute -top-28 -left-24 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-green-500/15 blur-3xl" />

      {/* Skip link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] ui-btn ui-btn-secondary">
        Skip to main content
      </a>

      {/* Title bar drag area */}
      <div
        className="fixed left-0 right-0 top-0 z-50 h-8"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <Sidebar />

      <div className="relative z-10 ml-3 flex min-w-0 flex-1 flex-col overflow-hidden pt-8">
        <main id="main-content" className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<DevicesPage />} />
            <Route path="/pair" element={<PairPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>

          <StatusBar adbPath={settings.adbPath} deviceCount={connectedCount} />
        </main>
      </div>
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
