import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as os from 'node:os'

const execAsync = promisify(exec)

const SSID_COMMAND: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'powershell -NoProfile -Command "(netsh wlan show interfaces) | Select-String \'^\\s+SSID\\s+:\' | Select-Object -First 1 | ForEach-Object { $_ -replace \'.*SSID\\s+:\\s+\', \'\' }"',
  linux: 'nmcli -t -f active,ssid dev wifi | awk -F: \'$1=="yes"{print $2; exit}\'',
  darwin: '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | awk -F": " \'/ SSID/ {print $2}\'',
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

export async function getSsid(): Promise<string | null> {
  return runTrimmed(SSID_COMMAND[process.platform])
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
