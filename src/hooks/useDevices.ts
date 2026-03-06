import { useState, useEffect, useCallback, useRef } from 'react'
import type { AdbDevice } from '../../shared/types'

export function useDevices(intervalMs: number = 3000) {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const fetchDevices = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      setLoading(true)
      const result = await window.electronAPI.adb.getDevices()
      if (result.success && result.data) {
        setDevices(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to get devices')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    timerRef.current = window.setInterval(fetchDevices, intervalMs)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [fetchDevices, intervalMs])

  const connectDevice = useCallback(async (host: string, port: number) => {
    const result = await window.electronAPI.adb.connect(host, port)
    if (result.success) await fetchDevices()
    return result
  }, [fetchDevices])

  const disconnectDevice = useCallback(async (serial: string) => {
    const result = await window.electronAPI.adb.disconnect(serial)
    if (result.success) await fetchDevices()
    return result
  }, [fetchDevices])

  return { devices, loading, error, refresh: fetchDevices, connectDevice, disconnectDevice }
}
