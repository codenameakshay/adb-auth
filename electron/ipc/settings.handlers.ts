import { IPC } from '../../shared/ipc-channels.js'
import type { AppSettings } from '../../shared/types.js'
import { getStore } from '../services/store.service.js'
import { handle } from './helpers.js'

export function registerSettingsHandlers(): void {
  handle<AppSettings>(IPC.SETTINGS_GET, () => getStore().get())

  handle<AppSettings>(IPC.SETTINGS_SET, (partial: Partial<AppSettings>) => getStore().set(partial))
}
