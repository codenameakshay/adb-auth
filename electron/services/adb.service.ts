import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { AdbDevice, MdnsService } from '../../shared/types.js'

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeHost(host: string): string {
  return host.replace(/\.$/, '').trim().toLowerCase()
}

export function parseDeviceList(output: string): AdbDevice[] {
  const lines = output.split('\n').filter((l) => l.trim())
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
      model: kvPairs.model,
      product: kvPairs.product,
      isWifi,
      ip,
      port,
    })
  }

  return devices
}

export function parseMdnsServices(output: string): MdnsService[] {
  const services: MdnsService[] = []

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('*') || line.toLowerCase().includes('list of discovered')) continue

    const typeMatch = line.match(/(_adb-tls-(?:connect|pairing)\._tcp)\.?/)
    const endpointMatch = line.match(/([a-zA-Z0-9._:-]+):(\d+)\s*$/)
    if (!typeMatch || !endpointMatch) continue

    const parts = line.split(/\s+/)
    const name = parts[0] || 'unknown'
    const type = typeMatch[1]
    const host = endpointMatch[1].replace(/^\[/, '').replace(/\]$/, '')
    const port = Number.parseInt(endpointMatch[2], 10)

    if (!Number.isFinite(port)) continue

    services.push({
      name,
      type,
      host: host.replace(/\.$/, ''),
      port,
    })
  }

  return services
}

export function isPairOutputSuccessful(output: string): boolean {
  const normalized = output.toLowerCase()
  return normalized.includes('successfully paired') || normalized.includes('paired to')
}

export function isConnectOutputSuccessful(output: string): boolean {
  const normalized = output.toLowerCase()
  return normalized.includes('connected to')
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

export async function discoverMdnsServices(typeFilter?: '_adb-tls-connect._tcp' | '_adb-tls-pairing._tcp'): Promise<MdnsService[]> {
  const output = await run('mdns services', 15000)
  const all = parseMdnsServices(output)
  if (!typeFilter) return all
  return all.filter((svc) => svc.type === typeFilter)
}

interface WaitForMdnsOptions {
  type: '_adb-tls-connect._tcp' | '_adb-tls-pairing._tcp'
  name?: string
  hostHint?: string
  timeoutMs?: number
  pollMs?: number
}

export async function waitForMdnsService(options: WaitForMdnsOptions): Promise<MdnsService> {
  const timeoutMs = options.timeoutMs ?? 30000
  const pollMs = options.pollMs ?? 1500
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const services = await discoverMdnsServices(options.type)
    const normalizedHostHint = options.hostHint ? normalizeHost(options.hostHint) : null

    const match = services.find((svc) => {
      if (options.name && svc.name !== options.name) return false
      if (normalizedHostHint) {
        const currentHost = normalizeHost(svc.host)
        if (currentHost !== normalizedHostHint) return false
      }
      return true
    })

    if (match) {
      return {
        ...match,
        host: match.host.replace(/\.$/, ''),
      }
    }

    await sleep(pollMs)
  }

  throw new Error(`Timed out waiting for ${options.type} service`) 
}

export async function autoConnectDevice(hostHint?: string): Promise<string> {
  const svc = await waitForMdnsService({
    type: '_adb-tls-connect._tcp',
    hostHint,
    timeoutMs: 20000,
    pollMs: 1500,
  })

  const output = await connectDevice(svc.host, svc.port)
  if (!isConnectOutputSuccessful(output)) {
    throw new Error(output.trim() || `Failed to connect to ${svc.host}:${svc.port}`)
  }

  return output
}

export async function killServer(): Promise<void> {
  await run('kill-server', 10000)
}

export async function startServer(): Promise<void> {
  await run('start-server', 15000)
}
