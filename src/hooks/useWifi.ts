import { useState, useCallback, useMemo } from 'react'
import { usePolling } from './usePolling'

export function useWifi() {
  const [ssid, setSsid] = useState<string | null>(null)
  const [ip, setIp] = useState<string | null>(null)

  const fetchWifi = useCallback(async () => {
    const [ssidResult, ipResult] = await Promise.all([
      window.electronAPI.wifi.getSsid(),
      window.electronAPI.wifi.getIp(),
    ])
    if (ssidResult.success) setSsid(ssidResult.data ?? null)
    if (ipResult.success) setIp(ipResult.data ?? null)
  }, [])

  usePolling(() => void fetchWifi(), 10000, { immediate: true })

  const copyIp = useCallback(() => {
    if (ip) navigator.clipboard.writeText(ip).catch(() => {})
  }, [ip])

  return useMemo(() => ({ ssid, ip, copyIp }), [ssid, ip, copyIp])
}
