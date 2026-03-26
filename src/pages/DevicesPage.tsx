import { RefreshCw, Smartphone, Plus, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { DeviceCard } from '../components/devices/DeviceCard'
import { useDevicesContext } from '../context/DevicesProvider'
import { QuickStartBanner } from '../components/onboarding/QuickStartBanner'
import { dismissQuickStart } from '../lib/onboardingStorage'
import { useState, useEffect } from 'react'
import type { MdnsService } from '../../shared/types'

const LOADING_HINTS = [
  'Running adb devices…',
  'Listening for wireless debug services…',
  'Syncing with platform-tools…',
] as const

/** Mount only while `loading` is true so hint index resets without an effect-driven setState. */
function DevicesLoadingHints() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % LOADING_HINTS.length)
    }, 2400)
    return () => window.clearInterval(id)
  }, [])
  return (
    <p className="ui-loading-hint sm:pl-0" aria-hidden="true">
      {LOADING_HINTS[idx]}
    </p>
  )
}

export function DevicesPage() {
  const { devices, loading, error, refresh, connectDevice, disconnectDevice } = useDevicesContext()
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

  useEffect(() => {
    if (connectedDevices.length > 0) dismissQuickStart()
  }, [connectedDevices.length])

  const adbMissing =
    error && (error.includes('not configured') || error.includes('ENOENT') || error.toLowerCase().includes('adb'))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Header
        title="Devices"
        subtitle="Shows connected phones, devices waiting for approval on the phone, and optional wireless-debug discoveries on your Wi‑Fi."
      />

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-8">
        {error && (
          <div className="ui-banner ui-banner-error ui-enter-soft mb-6" role="alert">
            {adbMissing
              ? "We couldn’t run adb. In Settings, point to your platform-tools adb executable—or install Android platform-tools—then try again."
              : error}
          </div>
        )}

        {connectedDevices.length === 0 && <QuickStartBanner />}

        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-app-text-secondary" role="status" aria-live="polite">
                {devices.length === 0
                  ? 'No devices yet'
                  : `${devices.length} ${devices.length === 1 ? 'device' : 'devices'} in list`}
              </p>
              {loading && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-app-text-muted" aria-hidden />}
            </div>
            {loading && <DevicesLoadingHints />}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} disabled={loading} className="ui-btn ui-btn-secondary min-w-0 flex-1 sm:flex-none">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh list
            </button>
            <button type="button" onClick={() => navigate('/pair')} className="ui-btn ui-btn-primary min-w-0 flex-1 sm:flex-none">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Pair new device
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8 sm:gap-10">
          {connectedDevices.length > 0 && (
            <section aria-labelledby="devices-connected-heading">
              <h2 id="devices-connected-heading" className="ui-overline mb-3">
                Connected
              </h2>
              <ul className="list-none space-y-3 p-0">
                {connectedDevices.map((device) => (
                  <li key={device.serial}>
                    <DeviceCard device={device} onConnect={connectDevice} onDisconnect={disconnectDevice} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {otherDevices.length > 0 && (
            <section aria-labelledby="devices-other-heading">
              <h2 id="devices-other-heading" className="ui-overline mb-3">
                Needs attention or offline
              </h2>
              <p className="mb-3 max-w-prose text-xs text-app-text-faint">
                USB cables, unplugged wireless ADB, or phones waiting for you to allow <span className="font-medium text-app-text-muted">USB debugging</span> show up here until ADB reports them as connected.
              </p>
              <ul className="list-none space-y-3 p-0">
                {otherDevices.map((device) => (
                  <li key={device.serial}>
                    <DeviceCard device={device} onConnect={connectDevice} onDisconnect={disconnectDevice} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {discoveredServices.length > 0 && (
            <section aria-labelledby="devices-mdns-heading">
              <h2 id="devices-mdns-heading" className="ui-overline mb-1">
                On your network
              </h2>
              <p className="mb-3 max-w-prose text-xs text-app-text-faint">
                Phones and tablets advertising wireless debugging on your Wi‑Fi. Connect only if you recognize the device name.
              </p>
              <ul className="list-none space-y-3 p-0">
                {discoveredServices.map((svc) => (
                  <li key={`${svc.type}:${svc.name}`}>
                    <div className="glass-panel-strong flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="ui-icon-tile ui-icon-tile--md ui-icon-tile--accent-blue shrink-0">
                        <Wifi className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-app-text-primary">{svc.name}</p>
                        <p className="font-code text-xs text-app-text-faint">
                          {svc.host}:{svc.port}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => connectDevice(svc.host.replace(/\.$/, ''), svc.port)}
                        className="ui-btn ui-btn-secondary min-h-11 w-full shrink-0 px-3 text-xs sm:w-auto"
                      >
                        Connect
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {devices.length === 0 && !loading && !error && (
          <div className="glass-panel-strong mt-4 flex flex-col items-center justify-center gap-5 px-5 py-14 text-center sm:mt-6 sm:py-16">
            <div className="ui-icon-well ui-icon-well--md ui-icon-well--muted ui-delight-float rounded-2xl">
              <Smartphone className="h-8 w-8 text-app-neutral-bright" aria-hidden />
            </div>
            <div className="max-w-md space-y-2">
              <p className="text-base font-semibold text-app-text-primary">No devices yet</p>
              <p className="text-sm leading-relaxed text-app-text-secondary">
                Plug in with USB or pair wirelessly. When ADB can reach the phone, it shows up here—use <span className="font-medium text-app-text-primary">Refresh list</span> after pairing or plugging in.
              </p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => navigate('/pair')} className="ui-btn ui-btn-primary min-h-11 w-full sm:w-auto">
                <Plus className="h-4 w-4" aria-hidden />
                Pair over Wi‑Fi
              </button>
              <button type="button" onClick={() => navigate('/settings')} className="ui-btn ui-btn-secondary min-h-11 w-full sm:w-auto">
                Check ADB path
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
