import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels.js'
import type { IpcResult } from '../../shared/types.js'
import * as wifi from '../services/wifi.service.js'

export function registerWifiHandlers(): void {
  ipcMain.handle(IPC.WIFI_GET_SSID, async (): Promise<IpcResult<string | null>> => {
    try {
      const ssid = await wifi.getSsid()
      return { success: true, data: ssid }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.WIFI_GET_IP, async (): Promise<IpcResult<string | null>> => {
    try {
      const ip = await wifi.getLocalIp()
      return { success: true, data: ip }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
