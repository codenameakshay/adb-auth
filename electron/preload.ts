import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels.js'
import type { IpcResult, AdbDevice, AppSettings, StartPairingResult, PairingStatus, MdnsService } from '../shared/types.js'

function subscribe<A extends unknown[]>(channel: string, cb: (...args: A) => void): () => void {
  const handler = (_: Electron.IpcRendererEvent, ...args: A) => cb(...args)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api = {
  // ADB
  adb: {
    getDevices: (): Promise<IpcResult<AdbDevice[]>> =>
      ipcRenderer.invoke(IPC.ADB_GET_DEVICES),
    pair: (host: string, port: number, code: string): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC.ADB_PAIR, host, port, code),
    connect: (host: string, port: number): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC.ADB_CONNECT, host, port),
    autoConnect: (hostHint?: string): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC.ADB_AUTO_CONNECT, hostHint),
    disconnect: (serial: string): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC.ADB_DISCONNECT, serial),
    killServer: (): Promise<IpcResult> =>
      ipcRenderer.invoke(IPC.ADB_KILL_SERVER),
    startServer: (): Promise<IpcResult> =>
      ipcRenderer.invoke(IPC.ADB_START_SERVER),
  },

  // WiFi
  wifi: {
    getSsid: (): Promise<IpcResult<string | null>> =>
      ipcRenderer.invoke(IPC.WIFI_GET_SSID),
    getIp: (): Promise<IpcResult<string | null>> =>
      ipcRenderer.invoke(IPC.WIFI_GET_IP),
  },

  // Pairing
  pairing: {
    start: (): Promise<IpcResult<StartPairingResult>> =>
      ipcRenderer.invoke(IPC.PAIRING_START),
    cancel: (): Promise<IpcResult> =>
      ipcRenderer.invoke(IPC.PAIRING_CANCEL),
    onStatus: (cb: (status: PairingStatus) => void) =>
      subscribe<[PairingStatus]>(IPC.PAIRING_STATUS, cb),
  },

  // mDNS
  mdns: {
    onDiscovered: (cb: (services: MdnsService[]) => void) =>
      subscribe<[MdnsService[]]>(IPC.MDNS_DISCOVERED, cb),
  },

  // Settings
  settings: {
    get: (): Promise<IpcResult<AppSettings>> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (partial: Partial<AppSettings>): Promise<IpcResult<AppSettings>> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, partial),
  },

  // Tray → renderer (one-way)
  app: {
    onNavigate: (cb: (path: string) => void) =>
      subscribe<[string]>(IPC.APP_NAVIGATE, cb),
    onRefreshDevices: (cb: () => void) =>
      subscribe<[]>(IPC.APP_REFRESH_DEVICES, cb),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
