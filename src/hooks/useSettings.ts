import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../shared/types'

const DEFAULTS: AppSettings = {
  adbPath: null,
  refreshInterval: 3000,
  minimizeToTray: false,
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.settings.get().then(result => {
      if (result.success && result.data) setSettings(result.data)
      setLoading(false)
    })
  }, [])

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.settings.set(partial)
    if (result.success && result.data) setSettings(result.data)
    return result
  }, [])

  return { settings, loading, updateSettings }
}
