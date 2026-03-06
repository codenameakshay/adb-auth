import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as os from 'node:os'

const execAsync = promisify(exec)

export async function getSsid(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(netsh wlan show interfaces) | Select-String \'^\s+SSID\s+:\' | Select-Object -First 1 | ForEach-Object { $_ -replace \'.*SSID\s+:\s+\', \'\' }"',
      { windowsHide: true, timeout: 5000 }
    )
    const ssid = stdout.trim()
    return ssid || null
  } catch {
    return null
  }
}

export async function getLocalIp(): Promise<string | null> {
  // First try via PowerShell for WiFi adapter
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like \'*Wi-Fi*\' -or $_.InterfaceAlias -like \'*Wireless*\' } | Select-Object -First 1 -ExpandProperty IPAddress"',
      { windowsHide: true, timeout: 5000 }
    )
    const ip = stdout.trim()
    if (ip && ip !== '127.0.0.1') return ip
  } catch {
    // fallback
  }

  // Fallback: use os.networkInterfaces()
  const interfaces = os.networkInterfaces()
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    const isWifi = /wi-?fi|wireless|wlan/i.test(name)
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (isWifi) return addr.address
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
