import { ipcMain, clipboard, BrowserWindow } from 'electron'
import {
  getClipboardHistory,
  deleteClipboardEntry,
  clearClipboardHistory,
  getSettings
} from './store'
import { setLastText } from './clipboard-monitor'

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
      const { execSync } = require('child_process')
      execSync(
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
}
