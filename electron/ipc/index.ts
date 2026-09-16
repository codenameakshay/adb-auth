import { registerAdbHandlers } from './adb.handlers.js'
import { registerWifiHandlers } from './wifi.handlers.js'
import { registerMdnsHandlers } from './mdns.handlers.js'
import { registerPairingHandlers } from './pairing.handlers.js'
import { registerSettingsHandlers } from './settings.handlers.js'

export function registerAllHandlers(): void {
  registerAdbHandlers()
  registerWifiHandlers()
  registerMdnsHandlers()
  registerPairingHandlers()
  registerSettingsHandlers()
}
