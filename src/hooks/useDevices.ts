import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { AdbDevice } from '../../shared/types'

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

export function useDevices(intervalMs: number = 3000) {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const visibleRef = useRef(typeof document !== 'undefined' && document.visibilityState === 'visible')

  const fetchDevices = useCallback(async (options?: { silent?: boolean }) => {
    if (!window.electronAPI) return
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const result = await window.electronAPI.adb.getDevices()
      if (result.success && result.data) {
        setDevices((prev) => (devicesDataEqual(prev, result.data!) ? prev : result.data!))
        setError((e) => (e === null ? e : null))
      } else {
        const msg = result.error || 'Failed to get devices'
        setError((e) => (e === msg ? e : msg))
      }
    } catch (err) {
      const msg = String(err)
      setError((e) => (e === msg ? e : msg))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible'
      if (visibleRef.current) void fetchDevices({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchDevices])

  useEffect(() => {
    void fetchDevices()
    timerRef.current = window.setInterval(() => {
      if (visibleRef.current) void fetchDevices({ silent: true })
    }, intervalMs)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [fetchDevices, intervalMs])

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

  return useMemo(
    () => ({
      devices,
      loading,
      error,
      refresh,
      connectDevice,
      disconnectDevice,
    }),
    [devices, loading, error, refresh, connectDevice, disconnectDevice]
  )
}
