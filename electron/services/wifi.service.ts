import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as os from 'node:os'

const execAsync = promisify(exec)
const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'
const isMac = process.platform === 'darwin'

export async function getSsid(): Promise<string | null> {
  try {
    if (isWindows) {
      const { stdout } = await execAsync(
        'powershell -NoProfile -Command "(netsh wlan show interfaces) | Select-String \'^\\s+SSID\\s+:\' | Select-Object -First 1 | ForEach-Object { $_ -replace \'.*SSID\\s+:\\s+\', \'\' }"',
        { windowsHide: true, timeout: 5000 }
      )
      const ssid = stdout.trim()
      return ssid || null
    }

    if (isLinux) {
      const { stdout } = await execAsync(
        'nmcli -t -f active,ssid dev wifi | awk -F: \'$1=="yes"{print $2; exit}\'',
        { windowsHide: true, timeout: 5000 }
      )
      const ssid = stdout.trim()
      return ssid || null
    }

    if (isMac) {
      const { stdout } = await execAsync(
        '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | awk -F": " \'/ SSID/ {print $2}\'',
        { windowsHide: true, timeout: 5000 }
      )
      const ssid = stdout.trim()
      return ssid || null
    }

    return null
  } catch {
    return null
  }
}

export async function getLocalIp(): Promise<string | null> {
  if (isWindows) {
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
  } else if (isLinux) {
    try {
      const { stdout } = await execAsync(
        'ip route get 1.1.1.1 | awk \'{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}\'',
        { windowsHide: true, timeout: 5000 }
      )
      const ip = stdout.trim()
      if (ip && ip !== '127.0.0.1') return ip
    } catch {
      // fallback
    }
  } else if (isMac) {
    try {
      const { stdout } = await execAsync(
        'ipconfig getifaddr en0 || ipconfig getifaddr en1',
        { windowsHide: true, timeout: 5000 }
      )
      const ip = stdout.trim()
      if (ip && ip !== '127.0.0.1') return ip
    } catch {
      // fallback
    }
  }

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
