import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels.js'
import type { IpcResult, AppSettings } from '../../shared/types.js'
import { getStore } from '../services/store.service.js'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, async (): Promise<IpcResult<AppSettings>> => {
    try {
      const settings = getStore().get()
      return { success: true, data: settings }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_, partial: Partial<AppSettings>): Promise<IpcResult<AppSettings>> => {
    try {
      const settings = getStore().set(partial)
      return { success: true, data: settings }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
