import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as os from 'node:os'

const execAsync = promisify(exec)

const SSID_COMMAND: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'powershell -NoProfile -Command "(netsh wlan show interfaces) | Select-String \'^\\s+SSID\\s+:\' | Select-Object -First 1 | ForEach-Object { $_ -replace \'.*SSID\\s+:\\s+\', \'\' }"',
  linux: 'nmcli -t -f active,ssid dev wifi | awk -F: \'$1=="yes"{print $2; exit}\'',
  // airport was removed in macOS 14.4. Wi-Fi is not always en0, so look the device up first.
  darwin: 'dev=$(networksetup -listallhardwareports | awk \'/^Hardware Port: (Wi-Fi|AirPort)/{getline; print $2; exit}\'); ipconfig getsummary "${dev:-en0}"',
}

const IP_COMMAND: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like \'*Wi-Fi*\' -or $_.InterfaceAlias -like \'*Wireless*\' } | Select-Object -First 1 -ExpandProperty IPAddress"',
  linux: 'ip route get 1.1.1.1 | awk \'{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}\'',
  darwin: 'ipconfig getifaddr en0 || ipconfig getifaddr en1',
}

async function runTrimmed(cmd: string | undefined): Promise<string | null> {
  if (!cmd) return null
  try {
    const { stdout } = await execAsync(cmd, { windowsHide: true, timeout: 5000 })
    return stdout.trim() || null
  } catch {
    return null
  }
}

// ponytail: macOS 15+ redacts the SSID for apps without Location Services access, so this
// returns null there; a CoreWLAN helper with location permission is the upgrade path.
export function parseMacSsid(summary: string): string | null {
  const ssid = summary.match(/^\s*SSID : (.*)$/m)?.[1].trim()
  return ssid && ssid !== '<redacted>' ? ssid : null
}

export async function getSsid(): Promise<string | null> {
  const output = await runTrimmed(SSID_COMMAND[process.platform])
  if (process.platform !== 'darwin') return output
  return output ? parseMacSsid(output) : null
}

export async function getLocalIp(): Promise<string | null> {
  const ip = await runTrimmed(IP_COMMAND[process.platform])
  if (ip && ip !== '127.0.0.1') return ip

  // Fallback: use os.networkInterfaces and prefer wifi-like names
  const interfaces = os.networkInterfaces()
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    const isWifiLike = /wi-?fi|wireless|wlan|wl|airport|en0/i.test(name)
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (isWifiLike) return addr.address
      }
    }
  }

  // Last resort: any non-loopback IPv4
  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }

  return null
}
