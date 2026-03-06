import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs'
import * as path from 'node:path'

const execAsync = promisify(exec)

async function tryExec(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, { windowsHide: true, timeout: 5000 })
    const p = stdout.trim()
    if (p && fs.existsSync(p)) return p
    return null
  } catch {
    return null
  }
}

function envPath(varName: string): string | null {
  const val = process.env[varName]
  if (!val) return null
  const p = path.join(val, 'platform-tools', 'adb.exe')
  return fs.existsSync(p) ? p : null
}

function localPath(...segments: string[]): string | null {
  const p = path.join(...segments, 'adb.exe')
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
      const p = path.join(match[1].trim(), 'platform-tools', 'adb.exe')
      if (fs.existsSync(p)) return p
    }
    return null
  } catch {
    return null
  }
}

export async function detectAdbPath(): Promise<string | null> {
  // 1. where adb (Windows PATH)
  const fromWhere = await tryExec('where adb')
  if (fromWhere) return fromWhere.split('\n')[0].trim()

  // 2. PowerShell Get-Command
  const fromPs = await tryExec('powershell -NoProfile -Command "(Get-Command adb).Source"')
  if (fromPs) return fromPs

  // 3. %LOCALAPPDATA%\Android\Sdk
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const p = localPath(localAppData, 'Android', 'Sdk', 'platform-tools')
    if (p) return p
  }

  // 4. %ANDROID_HOME%
  const fromEnv = envPath('ANDROID_HOME') || envPath('ANDROID_SDK_ROOT')
  if (fromEnv) return fromEnv

  // 5. Scoop
  const userProfile = process.env.USERPROFILE
  if (userProfile) {
    const scoop = localPath(userProfile, 'scoop', 'apps', 'adb', 'current')
    if (scoop) return scoop
  }

  // 6. Registry
  const fromRegistry = await registryPath()
  if (fromRegistry) return fromRegistry

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
