import { app, BrowserWindow, Tray, Menu, nativeImage, clipboard, Notification } from 'electron'
import * as path from 'node:path'
import * as url from 'node:url'
import { IPC } from '../shared/ipc-channels.js'
import { registerAllHandlers } from './ipc/index.js'
import { getStore } from './services/store.service.js'
import { detectAdbPath } from './utils/adb-path.js'
import { setAdbPath, killServer, startServer } from './services/adb.service.js'
import * as wifi from './services/wifi.service.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../../resources/icon.ico')
    : path.join(__dirname, '../../resources/tray-icon.png')

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 620,
    minWidth: 800,
    minHeight: 520,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: iconPath,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('close', (event) => {
    const settings = getStore().get()
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })
}

function showMainWindow(): void {
  mainWindow?.show()
  mainWindow?.focus()
}

function navigateInApp(route: string): void {
  showMainWindow()
  mainWindow?.webContents.send(IPC.APP_NAVIGATE, route)
}

function refreshDevicesInApp(): void {
  mainWindow?.webContents.send(IPC.APP_REFRESH_DEVICES)
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Open ADB Auth',
      click: () => {
        showMainWindow()
      },
    },
    {
      label: 'Hide window',
      click: () => {
        mainWindow?.hide()
      },
    },
    { type: 'separator' },
    {
      label: 'Devices',
      click: () => {
        navigateInApp('/')
      },
    },
    {
      label: 'Pair over Wi‑Fi',
      click: () => {
        navigateInApp('/pair')
      },
    },
    {
      label: 'Settings',
      click: () => {
        navigateInApp('/settings')
      },
    },
    { type: 'separator' },
    {
      label: 'Refresh device list',
      click: () => {
        refreshDevicesInApp()
      },
    },
    {
      label: 'Copy this computer’s IP',
      click: async () => {
        try {
          const ip = await wifi.getLocalIp()
          if (ip) {
            clipboard.writeText(ip)
            return
          }
          if (Notification.isSupported()) {
            new Notification({
              title: 'ADB Auth',
              body: 'Could not detect a local IP address.',
            }).show()
          }
        } catch {
          if (Notification.isSupported()) {
            new Notification({ title: 'ADB Auth', body: 'Could not copy IP address.' }).show()
          }
        }
      },
    },
    {
      label: 'Restart ADB server',
      click: async () => {
        try {
          await killServer()
          await startServer()
          refreshDevicesInApp()
        } catch (err) {
          if (Notification.isSupported()) {
            new Notification({
              title: 'ADB Auth',
              body: `Could not restart ADB: ${String(err)}`,
            }).show()
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  tray.setContextMenu(buildTrayMenu())
  tray.setToolTip('ADB Auth')

  tray.on('double-click', () => {
    showMainWindow()
  })
}

async function initAdb(): Promise<void> {
  const settings = getStore().get()
  if (settings.adbPath) {
    setAdbPath(settings.adbPath)
    return
  }
  const detected = await detectAdbPath()
  if (detected) {
    setAdbPath(detected)
    getStore().set({ adbPath: detected })
  }
}

app.whenReady().then(async () => {
  await initAdb()
  createWindow()
  createTray()
  registerAllHandlers(mainWindow!)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Allow window to close on quit even if minimize-to-tray is on
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})
