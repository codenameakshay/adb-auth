import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels.js'
import { mdnsDiscovery } from '../services/mdns.service.js'
import type { MdnsService } from '../../shared/types.js'

export function registerMdnsHandlers(mainWindow: BrowserWindow): void {
  mdnsDiscovery.on('discovered', (services: MdnsService[]) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.MDNS_DISCOVERED, services)
    }
  })

  // Start discovery
  mdnsDiscovery.start().catch(console.error)
}
