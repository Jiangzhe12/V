import { ipcMain, clipboard, BrowserWindow, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import {
  getClipboardHistory,
  deleteClipboardEntry,
  clearClipboardHistory,
  getSettings
} from './store'
import { setLastText } from './clipboard-monitor'
import { closeScreenshotWindows, createPinWindow, closePinWindow } from './window-manager'

export function registerIpcHandlers(
  getClipboardWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('clipboard:get-history', () => {
    return getClipboardHistory()
  })

  ipcMain.on('clipboard:paste', (_event, id: string) => {
    const history = getClipboardHistory()
    const entry = history.find((e) => e.id === id)
    if (!entry) return

    clipboard.writeText(entry.text)
    setLastText(entry.text)

    const win = getClipboardWindow()
    if (win) win.hide()

    // Simulate Cmd+V to paste into frontmost app
    setTimeout(() => {
      exec(
        `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
      )
    }, 100)
  })

  ipcMain.on('clipboard:delete', (_event, id: string) => {
    const updated = deleteClipboardEntry(id)
    const win = getClipboardWindow()
    if (win) win.webContents.send('clipboard:updated', updated)
  })

  ipcMain.on('clipboard:clear', () => {
    const updated = clearClipboardHistory()
    const win = getClipboardWindow()
    if (win) win.webContents.send('clipboard:updated', updated)
  })

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  // --- Screenshot ---
  ipcMain.on('screenshot:cancel', () => {
    closeScreenshotWindows()
  })

  ipcMain.on('screenshot:done', (_event, action: string, imageDataUrl: string) => {
    closeScreenshotWindows()

    if (action === 'copy') {
      const img = nativeImage.createFromDataURL(imageDataUrl)
      clipboard.writeImage(img)
    } else if (action === 'save') {
      const settings = getSettings()
      const savePath = settings.screenshotSavePath
      if (!existsSync(savePath)) {
        mkdirSync(savePath, { recursive: true })
      }
      const filename = `V_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      const filePath = join(savePath, filename)
      const img = nativeImage.createFromDataURL(imageDataUrl)
      writeFileSync(filePath, img.toPNG())
    } else if (action === 'pin') {
      createPinWindow(imageDataUrl)
    }
  })

  // --- Pin ---
  ipcMain.on('pin:close', (event) => {
    closePinWindow(event.sender)
  })

  ipcMain.on('pin:move-by', (event, dx: number, dy: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const [x, y] = win.getPosition()
      win.setPosition(x + dx, y + dy)
    }
  })

  ipcMain.on('pin:toggle-on-top', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const isOnTop = win.isAlwaysOnTop()
      win.setAlwaysOnTop(!isOnTop, isOnTop ? undefined : 'floating')
    }
  })

  ipcMain.on('pin:toggle-click-through', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const current = (win as any)._clickThrough ?? false
      const next = !current
      win.setIgnoreMouseEvents(next, { forward: true })
      ;(win as any)._clickThrough = next
      event.sender.send('pin:click-through-changed', next)
    }
  })
}
