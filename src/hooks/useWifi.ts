import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePolling } from './usePolling'

export function useWifi() {
  const [ssid, setSsid] = useState<string | null>(null)
  const [ip, setIp] = useState<string | null>(null)

  const fetchWifi = useCallback(async () => {
    try {
      const [ssidResult, ipResult] = await Promise.all([
        window.electronAPI.wifi.getSsid(),
        window.electronAPI.wifi.getIp(),
      ])
      if (ssidResult.success) setSsid(ssidResult.data ?? null)
      if (ipResult.success) setIp(ipResult.data ?? null)
    } catch {
      /* ignore transient wifi lookup failures */
    } finally {
      // ponytail: empty finally works around a react-hooks/set-state-in-effect false positive on the mount fetch below
    }
  }, [])

  useEffect(() => {
    void fetchWifi()
  }, [fetchWifi])

  usePolling(() => void fetchWifi(), 10000)

  const copyIp = useCallback(() => {
    if (ip) navigator.clipboard.writeText(ip).catch(() => {})
  }, [ip])

  return useMemo(() => ({ ssid, ip, copyIp }), [ssid, ip, copyIp])
}
