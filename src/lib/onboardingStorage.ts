const QUICK_START_KEY = 'adb-auth.quickStartDismissed'

export function isQuickStartDismissed(): boolean {
  try {
    return localStorage.getItem(QUICK_START_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissQuickStart(): void {
  try {
    localStorage.setItem(QUICK_START_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}
