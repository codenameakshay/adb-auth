import { RefreshCw, Smartphone, Plus, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { DeviceCard } from '../components/devices/DeviceCard'
import { useDevices } from '../hooks/useDevices'
import { useSettings } from '../hooks/useSettings'
import { useState, useEffect } from 'react'
import type { MdnsService } from '../../shared/types'

export function DevicesPage() {
  const { settings } = useSettings()
  const { devices, loading, error, refresh, connectDevice, disconnectDevice } = useDevices(settings.refreshInterval)
  const [discoveredServices, setDiscoveredServices] = useState<MdnsService[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.electronAPI) return
    const unsub = window.electronAPI.mdns.onDiscovered((services) => {
      setDiscoveredServices(services)
    })
    return () => {
      unsub()
    }
  }, [])

  const connectedDevices = devices.filter((d) => d.status === 'device')
  const otherDevices = devices.filter((d) => d.status !== 'device')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header title="Devices" />

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="ui-banner ui-banner-error mb-4" role="alert">
            {error.includes('not configured') || error.includes('ENOENT')
              ? 'ADB not found. Configure the ADB path in Settings.'
              : error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
              {devices.length === 0 ? 'No devices' : `${devices.length} device${devices.length !== 1 ? 's' : ''}`}
            </h2>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-[var(--text-muted)]" aria-hidden />}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={loading} className="ui-btn ui-btn-secondary">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button onClick={() => navigate('/pair')} className="ui-btn ui-btn-primary">
              <Plus className="h-3.5 w-3.5" />
              Add Device
            </button>
          </div>
        </div>

        {connectedDevices.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Connected</h3>
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <DeviceCard key={device.serial} device={device} onConnect={connectDevice} onDisconnect={disconnectDevice} />
              ))}
            </div>
          </section>
        )}

        {otherDevices.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Other</h3>
            <div className="space-y-3">
              {otherDevices.map((device) => (
                <DeviceCard key={device.serial} device={device} onConnect={connectDevice} onDisconnect={disconnectDevice} />
              ))}
            </div>
          </section>
        )}

        {discoveredServices.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nearby (mDNS)</h3>
            <div className="space-y-3">
              {discoveredServices.map((svc) => (
                <div
                  key={`${svc.type}:${svc.name}`}
                  className="glass-panel-strong flex items-center gap-4 p-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-500/15">
                    <Wifi className="h-5 w-5 text-blue-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{svc.name}</p>
                    <p className="font-code text-xs text-[var(--text-faint)]">
                      {svc.host}:{svc.port}
                    </p>
                  </div>
                  <button
                    onClick={() => connectDevice(svc.host.replace(/\.$/, ''), svc.port)}
                    className="ui-btn ui-btn-secondary min-h-10 px-3 text-xs"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {devices.length === 0 && !loading && !error && (
          <div className="glass-panel-strong mt-6 flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-slate-800/50">
              <Smartphone className="h-8 w-8 text-slate-200" />
            </div>
            <div>
              <p className="mb-1 text-base font-semibold text-[var(--text-primary)]">No devices connected</p>
              <p className="text-sm text-[var(--text-secondary)]">Connect via USB or pair over Wi-Fi.</p>
            </div>
            <button onClick={() => navigate('/pair')} className="ui-btn ui-btn-primary">
              <Plus className="h-4 w-4" />
              Pair via Wi-Fi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
