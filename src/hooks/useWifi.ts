import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

export function useWifi() {
  const [ssid, setSsid] = useState<string | null>(null)
  const [ip, setIp] = useState<string | null>(null)
  const visibleRef = useRef(typeof document !== 'undefined' && document.visibilityState === 'visible')

  const fetchWifi = useCallback(async () => {
    if (!window.electronAPI) return
    const [ssidResult, ipResult] = await Promise.all([
      window.electronAPI.wifi.getSsid(),
      window.electronAPI.wifi.getIp(),
    ])
    if (ssidResult.success) setSsid(ssidResult.data ?? null)
    if (ipResult.success) setIp(ipResult.data ?? null)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible'
      if (visibleRef.current) void fetchWifi()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchWifi])

  useEffect(() => {
    const startId = window.setTimeout(() => {
      void fetchWifi()
    }, 0)
    const id = window.setInterval(() => {
      if (visibleRef.current) void fetchWifi()
    }, 10000)
    return () => {
      window.clearTimeout(startId)
      window.clearInterval(id)
    }
  }, [fetchWifi])

  const copyIp = useCallback(() => {
    if (ip) navigator.clipboard.writeText(ip).catch(() => {})
  }, [ip])

  return useMemo(() => ({ ssid, ip, copyIp }), [ssid, ip, copyIp])
}
