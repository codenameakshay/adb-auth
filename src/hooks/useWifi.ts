import { useState, useEffect } from 'react'

export function useWifi() {
  const [ssid, setSsid] = useState<string | null>(null)
  const [ip, setIp] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      if (!window.electronAPI) return
      const [ssidResult, ipResult] = await Promise.all([
        window.electronAPI.wifi.getSsid(),
        window.electronAPI.wifi.getIp(),
      ])
      if (ssidResult.success) setSsid(ssidResult.data ?? null)
      if (ipResult.success) setIp(ipResult.data ?? null)
    }

    fetch()
    const id = window.setInterval(fetch, 10000)
    return () => window.clearInterval(id)
  }, [])

  const copyIp = () => {
    if (ip) navigator.clipboard.writeText(ip).catch(() => {})
  }

  return { ssid, ip, copyIp }
}
