export interface AdbDevice {
  serial: string
  status: 'device' | 'offline' | 'unauthorized' | 'connecting'
  model?: string
  product?: string
  isWifi: boolean
  ip?: string
  port?: number
}

export interface MdnsService {
  name: string
  host: string
  port: number
  type: string
  addresses?: string[]
}

export interface AppSettings {
  adbPath: string | null
  refreshInterval: number
  minimizeToTray: boolean
}

export interface IpcResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface PairingStatus {
  status: 'waiting' | 'pairing' | 'success' | 'error'
  androidIp?: string
  error?: string
}

export interface StartPairingResult {
  qrDataUrl: string
  serviceName: string
}
