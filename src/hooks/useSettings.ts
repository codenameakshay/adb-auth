import { create } from 'zustand'
import type { AppSettings, IpcResult } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'

interface SettingsState {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => Promise<IpcResult<AppSettings>>
}

export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: async (partial) => {
    const result = await window.electronAPI.settings.set(partial)
    if (result.success && result.data) set({ settings: result.data })
    return result
  },
}))

window.electronAPI.settings.get().then((result) => {
  if (result.success && result.data) useSettings.setState({ settings: result.data })
})
