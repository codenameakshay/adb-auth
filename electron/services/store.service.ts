import { app } from 'electron'
import * as path from 'node:path'
import * as fs from 'node:fs'
import type { AppSettings } from '../../shared/types.js'

const DEFAULT_SETTINGS: AppSettings = {
  adbPath: null,
  refreshInterval: 3000,
  minimizeToTray: false,
}

class StoreService {
  private storePath: string
  private data: AppSettings

  constructor() {
    const userDataPath = app.getPath('userData')
    this.storePath = path.join(userDataPath, 'settings.json')
    this.data = this.load()
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf-8')
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.storePath), { recursive: true })
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch {
      // ignore
    }
  }

  get(): AppSettings {
    return { ...this.data }
  }

  set(partial: Partial<AppSettings>): AppSettings {
    this.data = { ...this.data, ...partial }
    this.save()
    return { ...this.data }
  }
}

let instance: StoreService | null = null

export function getStore(): StoreService {
  if (!instance) instance = new StoreService()
  return instance
}
