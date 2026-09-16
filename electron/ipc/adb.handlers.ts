import { IPC } from '../../shared/ipc-channels.js'
import type { AdbDevice } from '../../shared/types.js'
import * as adb from '../services/adb.service.js'
import { detectAdbPath, verifyAdbPath } from '../utils/adb-path.js'
import { getStore } from '../services/store.service.js'
import { handle } from './helpers.js'

function isValidPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65535
}

function isSafeHost(host: unknown): host is string {
  if (typeof host !== 'string') return false
  const trimmed = host.trim()
  if (!trimmed || trimmed.length > 253) return false
  return /^[a-zA-Z0-9.:-]+$/.test(trimmed)
}

function isSafeCode(code: unknown): code is string {
  if (typeof code !== 'string') return false
  const trimmed = code.trim()
  if (!trimmed) return false
  return /^[0-9]{6,10}$/.test(trimmed)
}

export function registerAdbHandlers(): void {
  handle<AdbDevice[]>(IPC.ADB_GET_DEVICES, () => adb.getDevices())

  handle<string>(IPC.ADB_PAIR, async (host: string, port: number, code: string) => {
    if (!isSafeHost(host) || !isValidPort(port) || !isSafeCode(code)) {
      throw new Error('Invalid host, port, or pairing code format')
    }

    const output = await adb.pairDevice(host.trim(), port, code.trim())
    if (!adb.isPairOutputSuccessful(output)) {
      throw new Error(output.trim() || 'adb pair failed')
    }
    return output.trim()
  })

  handle<string>(IPC.ADB_CONNECT, async (host: string, port: number) => {
    if (!isSafeHost(host) || !isValidPort(port)) {
      throw new Error('Invalid host or port format')
    }

    const output = await adb.connectDevice(host.trim(), port)
    if (!adb.isConnectOutputSuccessful(output)) {
      throw new Error(output.trim())
    }
    return output.trim()
  })

  handle<string>(IPC.ADB_AUTO_CONNECT, async (hostHint?: string) => {
    if (hostHint !== undefined && !isSafeHost(hostHint)) {
      throw new Error('Invalid host hint format')
    }

    const output = await adb.autoConnectDevice(hostHint?.trim())
    return output.trim()
  })

  handle<string>(IPC.ADB_DISCONNECT, async (serial: string) => {
    if (typeof serial !== 'string' || !serial.trim()) {
      throw new Error('Invalid serial')
    }

    const output = await adb.disconnectDevice(serial)
    return output.trim()
  })

  handle<string | null>(IPC.ADB_GET_PATH, async () => {
    const settings = getStore().get()
    if (settings.adbPath && (await verifyAdbPath(settings.adbPath))) {
      adb.setAdbPath(settings.adbPath)
      return settings.adbPath
    }

    const detected = await detectAdbPath()
    if (detected) {
      adb.setAdbPath(detected)
      getStore().set({ adbPath: detected })
      return detected
    }

    return null
  })

  handle<boolean>(IPC.ADB_VERIFY_PATH, async (p: string) => {
    const valid = await verifyAdbPath(p)
    if (valid) {
      adb.setAdbPath(p)
      getStore().set({ adbPath: p })
    }
    return valid
  })

  handle<void>(IPC.ADB_KILL_SERVER, () => adb.killServer())

  handle<void>(IPC.ADB_START_SERVER, () => adb.startServer())
}
