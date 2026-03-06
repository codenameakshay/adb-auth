import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels.js'
import type { IpcResult, StartPairingResult, PairingStatus } from '../../shared/types.js'
import { pairingServer } from '../services/pairing-server.service.js'

export function registerPairingHandlers(mainWindow: BrowserWindow): void {
  // Forward pairing status events to renderer
  pairingServer.on('status', (status: PairingStatus) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.PAIRING_STATUS, status)
    }
  })

  ipcMain.handle(IPC.PAIRING_START, async (): Promise<IpcResult<StartPairingResult>> => {
    try {
      // Cancel any existing session
      pairingServer.stop()

      const result = await pairingServer.start()
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.PAIRING_CANCEL, async (): Promise<IpcResult> => {
    try {
      pairingServer.stop()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
