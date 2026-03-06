import { ipcMain, dialog } from 'electron'
import { IPC } from '../../shared/ipc-channels.js'
import type { IpcResult, AdbDevice } from '../../shared/types.js'
import * as adb from '../services/adb.service.js'
import { detectAdbPath, verifyAdbPath } from '../utils/adb-path.js'
import { getStore } from '../services/store.service.js'

export function registerAdbHandlers(): void {
  ipcMain.handle(IPC.ADB_GET_DEVICES, async (): Promise<IpcResult<AdbDevice[]>> => {
    try {
      const devices = await adb.getDevices()
      return { success: true, data: devices }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_PAIR, async (_, host: string, port: number, code: string): Promise<IpcResult<string>> => {
    try {
      const output = await adb.pairDevice(host, port, code)
      const success = output.toLowerCase().includes('paired') || output.toLowerCase().includes('successfully paired')
      if (!success && output.toLowerCase().includes('failed')) {
        return { success: false, error: output.trim() }
      }
      return { success: true, data: output.trim() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_CONNECT, async (_, host: string, port: number): Promise<IpcResult<string>> => {
    try {
      const output = await adb.connectDevice(host, port)
      const success = output.toLowerCase().includes('connected')
      return { success, data: output.trim(), error: success ? undefined : output.trim() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_DISCONNECT, async (_, serial: string): Promise<IpcResult<string>> => {
    try {
      const output = await adb.disconnectDevice(serial)
      return { success: true, data: output.trim() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_GET_PATH, async (): Promise<IpcResult<string | null>> => {
    try {
      // Check stored path first
      const settings = getStore().get()
      if (settings.adbPath) {
        const valid = await verifyAdbPath(settings.adbPath)
        if (valid) {
          adb.setAdbPath(settings.adbPath)
          return { success: true, data: settings.adbPath }
        }
      }

      // Auto-detect
      const detected = await detectAdbPath()
      if (detected) {
        adb.setAdbPath(detected)
        getStore().set({ adbPath: detected })
        return { success: true, data: detected }
      }

      return { success: true, data: null }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_VERIFY_PATH, async (_, p: string): Promise<IpcResult<boolean>> => {
    try {
      const valid = await verifyAdbPath(p)
      if (valid) {
        adb.setAdbPath(p)
        getStore().set({ adbPath: p })
      }
      return { success: true, data: valid }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_KILL_SERVER, async (): Promise<IpcResult> => {
    try {
      await adb.killServer()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.ADB_START_SERVER, async (): Promise<IpcResult> => {
    try {
      await adb.startServer()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
