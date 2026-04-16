import { app, Tray, Menu, nativeImage, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { startClipboardMonitor } from './clipboard-monitor'
import { registerIpcHandlers } from './ipc-handlers'
import { getSettings } from './store'
import { startScreenshot, createPinWindow } from './window-manager'

let tray: Tray | null = null
let clipboardWindow: BrowserWindow | null = null

function getClipboardWindow(): BrowserWindow | null {
  return clipboardWindow
}

function createTray(): void {
  const iconPath = join(__dirname, '../../resources/iconTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip('V')

  const contextMenu = Menu.buildFromTemplate([
    { label: '关于 V', role: 'about' },
    { type: 'separator' },
    { label: '退出', role: 'quit' }
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    toggleClipboardPopup()
  })
}

function toggleClipboardPopup(): void {
  if (!clipboardWindow) return
  if (clipboardWindow.isVisible()) {
    clipboardWindow.hide()
  } else {
    positionClipboardWindow()
    clipboardWindow.show()
    clipboardWindow.focus()
  }
}

function positionClipboardWindow(): void {
  if (!clipboardWindow || !tray) return
  const trayBounds = tray.getBounds()
  const winBounds = clipboardWindow.getBounds()
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
  const y = trayBounds.y + trayBounds.height + 4
  clipboardWindow.setPosition(x, y, false)
}

function createClipboardWindow(): void {
  clipboardWindow = new BrowserWindow({
    width: 340,
    height: 460,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  clipboardWindow.on('blur', () => {
    clipboardWindow?.hide()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    clipboardWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/clipboard.html`)
  } else {
    clipboardWindow.loadFile(join(__dirname, '../renderer/clipboard.html'))
  }
}

function registerShortcuts(): void {
  const settings = getSettings()

  globalShortcut.register(settings.shortcuts.clipboard, () => {
    toggleClipboardPopup()
  })

  globalShortcut.register(settings.shortcuts.screenshot, () => {
    startScreenshot()
  })

  globalShortcut.register(settings.shortcuts.pin, () => {
    const { clipboard: cb } = require('electron')
    const img = cb.readImage()
    if (!img.isEmpty()) {
      createPinWindow(img.toDataURL())
    }
  })
}

app.whenReady().then(() => {
  app.dock?.hide()

  registerIpcHandlers(getClipboardWindow)
  createTray()
  createClipboardWindow()
  registerShortcuts()

  startClipboardMonitor((entries) => {
    if (clipboardWindow) {
      clipboardWindow.webContents.send('clipboard:updated', entries)
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Don't quit — menu bar app
})
