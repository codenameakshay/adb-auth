import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const execAsync = promisify(exec)
const isWindows = process.platform === 'win32'
const adbBinaryName = isWindows ? 'adb.exe' : 'adb'

async function tryExec(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, { windowsHide: true, timeout: 5000 })
    const firstLine = stdout
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean)
    if (firstLine && fs.existsSync(firstLine)) return firstLine
    return null
  } catch {
    return null
  }
}

function envPath(varName: string): string | null {
  const val = process.env[varName]
  if (!val) return null
  const p = path.join(val, 'platform-tools', adbBinaryName)
  return fs.existsSync(p) ? p : null
}

function localPath(...segments: string[]): string | null {
  const p = path.join(...segments, adbBinaryName)
  return fs.existsSync(p) ? p : null
}

async function registryPath(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'reg query "HKCU\\Software\\Android Studio" /v "SdkPath" 2>nul',
      { windowsHide: true, timeout: 3000 }
    )
    const match = stdout.match(/SdkPath\s+REG_SZ\s+(.+)/)
    if (match) {
      const p = path.join(match[1].trim(), 'platform-tools', adbBinaryName)
      if (fs.existsSync(p)) return p
    }
    return null
  } catch {
    return null
  }
}

export async function detectAdbPath(): Promise<string | null> {
  // 1. PATH lookup
  const fromPathLookup = await tryExec(isWindows ? 'where adb' : 'command -v adb')
  if (fromPathLookup) return fromPathLookup

  // 2. SDK env vars
  const fromEnv = envPath('ANDROID_HOME') || envPath('ANDROID_SDK_ROOT')
  if (fromEnv) return fromEnv

  if (isWindows) {
    // 3w. %LOCALAPPDATA%\Android\Sdk
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      const p = localPath(localAppData, 'Android', 'Sdk', 'platform-tools')
      if (p) return p
    }

    // 4w. PowerShell Get-Command
    const fromPs = await tryExec('powershell -NoProfile -Command "(Get-Command adb).Source"')
    if (fromPs) return fromPs

    // 5w. Scoop install
    const userProfile = process.env.USERPROFILE
    if (userProfile) {
      const scoop = localPath(userProfile, 'scoop', 'apps', 'adb', 'current')
      if (scoop) return scoop
    }

    // 6w. Android Studio SDK from registry
    const fromRegistry = await registryPath()
    if (fromRegistry) return fromRegistry
  } else {
    const home = os.homedir()
    const linuxMacCandidates = [
      path.join(home, 'Android', 'Sdk', 'platform-tools', adbBinaryName),
      path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', adbBinaryName),
      path.join('/opt', 'android-sdk', 'platform-tools', adbBinaryName),
      path.join('/usr', 'local', 'android-sdk', 'platform-tools', adbBinaryName),
      path.join('/usr', 'lib', 'android-sdk', 'platform-tools', adbBinaryName),
    ]
    for (const candidate of linuxMacCandidates) {
      if (fs.existsSync(candidate)) return candidate
    }
  }

  return null
}

export async function verifyAdbPath(adbPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(adbPath)) return false
    const { stdout } = await execAsync(`"${adbPath}" version`, {
      windowsHide: true,
      timeout: 5000,
    })
    return stdout.includes('Android Debug Bridge')
  } catch {
    return false
  }
}
