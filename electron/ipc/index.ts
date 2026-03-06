import type { BrowserWindow } from 'electron'
import { registerAdbHandlers } from './adb.handlers.js'
import { registerWifiHandlers } from './wifi.handlers.js'
import { registerMdnsHandlers } from './mdns.handlers.js'
import { registerPairingHandlers } from './pairing.handlers.js'
import { registerSettingsHandlers } from './settings.handlers.js'

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  registerAdbHandlers()
  registerWifiHandlers()
  registerMdnsHandlers(mainWindow)
  registerPairingHandlers(mainWindow)
  registerSettingsHandlers()
}
