import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { AdbDevice } from '../../shared/types.js'

const execAsync = promisify(exec)

let adbPath: string | null = null

export function setAdbPath(p: string | null): void {
  adbPath = p
}

export function getAdbPath(): string | null {
  return adbPath
}

function getAdb(): string {
  if (!adbPath) throw new Error('ADB path not configured')
  return `"${adbPath}"`
}

async function run(args: string, timeoutMs = 10000): Promise<string> {
  const { stdout } = await execAsync(`${getAdb()} ${args}`, {
    windowsHide: true,
    timeout: timeoutMs,
  })
  return stdout
}

export function parseDeviceList(output: string): AdbDevice[] {
  const lines = output.split('\n').filter(l => l.trim())
  const devices: AdbDevice[] = []

  for (const line of lines) {
    if (line.startsWith('List of devices') || line.startsWith('*')) continue
    const parts = line.split(/\s+/)
    if (parts.length < 2) continue

    const serial = parts[0]
    const status = parts[1] as AdbDevice['status']

    if (!['device', 'offline', 'unauthorized', 'connecting'].includes(status)) continue

    const isWifi = serial.includes(':')
    let ip: string | undefined
    let port: number | undefined

    if (isWifi) {
      const colonIdx = serial.lastIndexOf(':')
      ip = serial.substring(0, colonIdx)
      port = parseInt(serial.substring(colonIdx + 1), 10)
    }

    const kvPairs: Record<string, string> = {}
    for (let i = 2; i < parts.length; i++) {
      const kv = parts[i].split(':')
      if (kv.length === 2) kvPairs[kv[0]] = kv[1]
    }

    devices.push({
      serial,
      status,
      model: kvPairs['model'],
      product: kvPairs['product'],
      isWifi,
      ip,
      port,
    })
  }

  return devices
}

export async function getDevices(): Promise<AdbDevice[]> {
  const output = await run('devices -l')
  return parseDeviceList(output)
}

export async function pairDevice(host: string, port: number, code: string): Promise<string> {
  const output = await run(`pair ${host}:${port} ${code}`, 30000)
  return output
}

export async function connectDevice(host: string, port: number): Promise<string> {
  const output = await run(`connect ${host}:${port}`, 15000)
  return output
}

export async function disconnectDevice(serial: string): Promise<string> {
  const output = await run(`disconnect ${serial}`, 10000)
  return output
}

export async function killServer(): Promise<void> {
  await run('kill-server', 10000)
}

export async function startServer(): Promise<void> {
  await run('start-server', 15000)
}
