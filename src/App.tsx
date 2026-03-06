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
  const connectedCount = devices.filter(d => d.status === 'device').length

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-white overflow-hidden select-none">
      {/* Title bar drag area */}
      <div
        className="fixed top-0 left-0 right-0 h-8 z-50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden pt-8">
        <Routes>
          <Route path="/" element={<DevicesPage />} />
          <Route path="/pair" element={<PairPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>

        <StatusBar
          adbPath={settings.adbPath}
          deviceCount={connectedCount}
        />
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
