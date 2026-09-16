import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AdbDevice } from '../../shared/types'
import { usePolling } from './usePolling'

function deviceRowEqual(a: AdbDevice, b: AdbDevice): boolean {
  return (
    a.serial === b.serial &&
    a.status === b.status &&
    a.model === b.model &&
    a.product === b.product &&
    a.isWifi === b.isWifi &&
    a.ip === b.ip &&
    a.port === b.port
  )
}

/** Order-independent: avoids re-renders when ADB returns the same devices in a different order. */
function devicesDataEqual(prev: AdbDevice[], next: AdbDevice[]): boolean {
  if (prev.length !== next.length) return false
  const bySerial = new Map(prev.map((d) => [d.serial, d]))
  for (const d of next) {
    const p = bySerial.get(d.serial)
    if (!p || !deviceRowEqual(p, d)) return false
  }
  return true
}

export function useDevices(intervalMs: number) {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const result = await window.electronAPI.adb.getDevices()
      if (result.success && result.data) {
        setDevices((prev) => (devicesDataEqual(prev, result.data!) ? prev : result.data!))
        setError(null)
      } else {
        setError(result.error || 'Failed to get devices')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDevices()
  }, [fetchDevices])

  usePolling(() => void fetchDevices({ silent: true }), intervalMs)

  const refresh = useCallback(() => fetchDevices({ silent: false }), [fetchDevices])

  const connectDevice = useCallback(
    async (host: string, port: number) => {
      const result = await window.electronAPI.adb.connect(host, port)
      if (result.success) await fetchDevices({ silent: true })
      return result
    },
    [fetchDevices]
  )

  const disconnectDevice = useCallback(
    async (serial: string) => {
      const result = await window.electronAPI.adb.disconnect(serial)
      if (result.success) await fetchDevices({ silent: true })
      return result
    },
    [fetchDevices]
  )

  const connectedDevices = useMemo(() => devices.filter((d) => d.status === 'device'), [devices])
  const otherDevices = useMemo(() => devices.filter((d) => d.status !== 'device'), [devices])

  return useMemo(
    () => ({
      devices,
      connectedDevices,
      otherDevices,
      loading,
      error,
      refresh,
      connectDevice,
      disconnectDevice,
    }),
    [devices, connectedDevices, otherDevices, loading, error, refresh, connectDevice, disconnectDevice]
  )
}
