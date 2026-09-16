import { IPC } from '../../shared/ipc-channels.js'
import * as wifi from '../services/wifi.service.js'
import { handle } from './helpers.js'

export function registerWifiHandlers(): void {
  handle<string | null>(IPC.WIFI_GET_SSID, () => wifi.getSsid())
  handle<string | null>(IPC.WIFI_GET_IP, () => wifi.getLocalIp())
}
