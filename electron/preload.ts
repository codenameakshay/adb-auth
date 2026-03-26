import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels.js'
import type { IpcResult, AdbDevice, AppSettings, StartPairingResult, PairingStatus, MdnsService } from '../shared/types.js'

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
    getPath: (): Promise<IpcResult<string | null>> =>
      ipcRenderer.invoke(IPC.ADB_GET_PATH),
    verifyPath: (p: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC.ADB_VERIFY_PATH, p),
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
    onStatus: (cb: (status: PairingStatus) => void) => {
      const handler = (_: Electron.IpcRendererEvent, status: PairingStatus) => cb(status)
      ipcRenderer.on(IPC.PAIRING_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC.PAIRING_STATUS, handler)
    },
  },

  // mDNS
  mdns: {
    onDiscovered: (cb: (services: MdnsService[]) => void) => {
      const handler = (_: Electron.IpcRendererEvent, services: MdnsService[]) => cb(services)
      ipcRenderer.on(IPC.MDNS_DISCOVERED, handler)
      return () => ipcRenderer.removeListener(IPC.MDNS_DISCOVERED, handler)
    },
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
    onNavigate: (cb: (path: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, path: string) => cb(path)
      ipcRenderer.on(IPC.APP_NAVIGATE, handler)
      return () => ipcRenderer.removeListener(IPC.APP_NAVIGATE, handler)
    },
    onRefreshDevices: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on(IPC.APP_REFRESH_DEVICES, handler)
      return () => ipcRenderer.removeListener(IPC.APP_REFRESH_DEVICES, handler)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
