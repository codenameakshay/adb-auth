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
    const unsub = window.electronAPI.mdns.onDiscovered(services => {
      setDiscoveredServices(services)
    })
    return () => { unsub() }
  }, [])

  const connectedDevices = devices.filter(d => d.status === 'device')
  const otherDevices = devices.filter(d => d.status !== 'device')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Devices" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error.includes('not configured') || error.includes('ENOENT')
              ? 'ADB not found. Please configure the ADB path in Settings.'
              : error
            }
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-neutral-300">
              {devices.length === 0 ? 'No devices' : `${devices.length} device${devices.length !== 1 ? 's' : ''}`}
            </h2>
            {loading && (
              <div className="w-3 h-3 rounded-full border border-neutral-600 border-t-white animate-spin" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => navigate('/pair')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Device
            </button>
          </div>
        </div>

        {/* Connected devices */}
        {connectedDevices.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Connected</h3>
            <div className="space-y-2">
              {connectedDevices.map(device => (
                <DeviceCard
                  key={device.serial}
                  device={device}
                  onConnect={connectDevice}
                  onDisconnect={disconnectDevice}
                />
              ))}
            </div>
          </section>
        )}

        {/* Other devices */}
        {otherDevices.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Other</h3>
            <div className="space-y-2">
              {otherDevices.map(device => (
                <DeviceCard
                  key={device.serial}
                  device={device}
                  onConnect={connectDevice}
                  onDisconnect={disconnectDevice}
                />
              ))}
            </div>
          </section>
        )}

        {/* mDNS discovered */}
        {discoveredServices.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Nearby (mDNS)</h3>
            <div className="space-y-2">
              {discoveredServices.map(svc => (
                <div key={`${svc.type}:${svc.name}`} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{svc.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{svc.host}:{svc.port}</p>
                  </div>
                  <button
                    onClick={() => connectDevice(svc.host.replace(/\.$/, ''), svc.port)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 transition-colors"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {devices.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-neutral-600" />
            </div>
            <div className="text-center">
              <p className="text-neutral-300 font-medium mb-1">No devices connected</p>
              <p className="text-neutral-600 text-sm">Connect a device via USB or pair via WiFi</p>
            </div>
            <button
              onClick={() => navigate('/pair')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Pair via WiFi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
