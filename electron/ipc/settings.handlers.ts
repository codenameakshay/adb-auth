import { IPC } from '../../shared/ipc-channels.js'
import type { AppSettings } from '../../shared/types.js'
import { getStore } from '../services/store.service.js'
import * as adb from '../services/adb.service.js'
import { verifyAdbPath } from '../utils/adb-path.js'
import { handle } from './helpers.js'

async function validateSettings(partial: Partial<AppSettings>): Promise<Partial<AppSettings>> {
  const validated: Partial<AppSettings> = {}

  if ('adbPath' in partial) {
    if (typeof partial.adbPath !== 'string' || !partial.adbPath.trim()) {
      throw new Error('That path is not a working adb executable')
    }
    const path = partial.adbPath.trim()
    if (!(await verifyAdbPath(path))) {
      throw new Error('That path is not a working adb executable')
    }
    adb.setAdbPath(path)
    validated.adbPath = path
  }

  if ('refreshInterval' in partial) {
    if (typeof partial.refreshInterval !== 'number' || !Number.isFinite(partial.refreshInterval) || partial.refreshInterval <= 0) {
      throw new Error('refreshInterval must be a positive finite number')
    }
    validated.refreshInterval = partial.refreshInterval
  }

  if ('minimizeToTray' in partial) {
    if (typeof partial.minimizeToTray !== 'boolean') {
      throw new Error('minimizeToTray must be a boolean')
    }
    validated.minimizeToTray = partial.minimizeToTray
  }

  return validated
}

export function registerSettingsHandlers(): void {
  handle<AppSettings>(IPC.SETTINGS_GET, () => getStore().get())

  handle<AppSettings>(IPC.SETTINGS_SET, async (partial: Partial<AppSettings>) => {
    const validated = await validateSettings(partial)
    return getStore().set(validated)
  })
}
