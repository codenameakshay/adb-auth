import { EventEmitter } from 'node:events'
import * as crypto from 'node:crypto'
import type { PairingStatus, StartPairingResult } from '../../shared/types.js'
import {
  waitForMdnsService,
  pairDevice,
  connectDevice,
  isPairOutputSuccessful,
  isConnectOutputSuccessful,
} from './adb.service.js'

type QRModule = {
  toDataURL: (
    text: string,
    opts?: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
      width?: number
      margin?: number
      color?: { dark: string; light: string }
    }
  ) => Promise<string>
}

let QRCode: QRModule | null = null

async function getQRCode() {
  if (!QRCode) {
    const mod = await import('qrcode')
    QRCode = (mod.default || mod) as QRModule
  }
  return QRCode
}

function randomDigits(count: number): string {
  let out = ''
  while (out.length < count) {
    out += crypto.randomInt(0, 10).toString()
  }
  return out
}

function randomStudioServiceName(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 10; i++) {
    suffix += alphabet[crypto.randomInt(0, alphabet.length)]
  }
  return `studio-${suffix}`
}

function normalizeHost(host: string): string {
  return host.replace(/\.$/, '').trim()
}

class PairingServerService extends EventEmitter {
  private token = 0

  async start(): Promise<StartPairingResult> {
    this.stop()
    const currentToken = ++this.token

    const serviceName = randomStudioServiceName()
    const password = randomDigits(10)

    const qrString = `WIFI:T:ADB;S:${serviceName};P:${password};;`
    const QR = await getQRCode()
    const qrDataUrl = await QR.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    this.emitStatus(currentToken, {
      status: 'waiting',
      stage: 'waiting_for_scan',
      detail: 'Scan this QR code from Wireless Debugging on your Android device.',
    })

    void this.runFlow(currentToken, serviceName, password)

    return { qrDataUrl, serviceName }
  }

  private emitStatus(token: number, status: PairingStatus): void {
    if (token !== this.token) return
    this.emit('status', status)
  }

  private async runFlow(token: number, serviceName: string, password: string): Promise<void> {
    try {
      this.emitStatus(token, {
        status: 'waiting',
        stage: 'waiting_for_pairing_service',
        detail: 'Waiting for your Android device pairing service...',
      })

      const pairingService = await waitForMdnsService({
        type: '_adb-tls-pairing._tcp',
        name: serviceName,
        timeoutMs: 90000,
        pollMs: 1500,
      })

      const pairingHost = normalizeHost(pairingService.host)

      this.emitStatus(token, {
        status: 'pairing',
        stage: 'pairing',
        androidIp: pairingHost,
        detail: `Pairing with ${pairingHost}:${pairingService.port}...`,
      })

      const pairOutput = await pairDevice(pairingHost, pairingService.port, password)
      if (!isPairOutputSuccessful(pairOutput)) {
        throw new Error(pairOutput.trim() || 'adb pair failed')
      }

      this.emitStatus(token, {
        status: 'waiting',
        stage: 'waiting_for_connect_service',
        androidIp: pairingHost,
        detail: 'Pairing accepted. Waiting for wireless debug endpoint...',
      })

      const connectService = await waitForMdnsService({
        type: '_adb-tls-connect._tcp',
        hostHint: pairingHost,
        timeoutMs: 45000,
        pollMs: 1500,
      })

      const connectHost = normalizeHost(connectService.host)

      this.emitStatus(token, {
        status: 'connecting',
        stage: 'connecting',
        androidIp: connectHost,
        detail: `Connecting to ${connectHost}:${connectService.port}...`,
      })

      const connectOutput = await connectDevice(connectHost, connectService.port)
      if (!isConnectOutputSuccessful(connectOutput)) {
        throw new Error(connectOutput.trim() || 'adb connect failed')
      }

      this.emitStatus(token, {
        status: 'success',
        stage: 'success',
        androidIp: connectHost,
        detail: `Connected to ${connectHost}:${connectService.port}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.emitStatus(token, {
        status: 'error',
        stage: 'error',
        error: msg,
      })
    }
  }

  stop(): void {
    this.token++
  }
}

export const pairingServer = new PairingServerService()
