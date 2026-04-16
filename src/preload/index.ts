import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Clipboard
  getClipboardHistory: () => ipcRenderer.invoke('clipboard:get-history'),
  onClipboardUpdate: (callback: (entries: unknown[]) => void) => {
    const handler = (_event: unknown, entries: unknown[]) => callback(entries)
    ipcRenderer.on('clipboard:updated', handler)
    return () => ipcRenderer.removeListener('clipboard:updated', handler)
  },
  pasteEntry: (id: string) => ipcRenderer.send('clipboard:paste', id),
  deleteEntry: (id: string) => ipcRenderer.send('clipboard:delete', id),
  clearHistory: () => ipcRenderer.send('clipboard:clear'),

  // Screenshot
  onScreenshotData: (callback: (dataUrl: string, bounds: unknown) => void) => {
    const handler = (_event: unknown, dataUrl: string, bounds: unknown) => callback(dataUrl, bounds)
    ipcRenderer.on('screenshot:data', handler)
    return () => ipcRenderer.removeListener('screenshot:data', handler)
  },
  screenshotDone: (action: string, imageDataUrl: string) =>
    ipcRenderer.send('screenshot:done', action, imageDataUrl),
  cancelScreenshot: () => ipcRenderer.send('screenshot:cancel'),

  // Pin
  onPinInit: (callback: (pinId: string, imageDataUrl: string) => void) => {
    const handler = (_event: unknown, pinId: string, imageDataUrl: string) => callback(pinId, imageDataUrl)
    ipcRenderer.on('pin:init', handler)
    return () => ipcRenderer.removeListener('pin:init', handler)
  },
  closePin: () => ipcRenderer.send('pin:close'),
  movePinWindow: (dx: number, dy: number) => ipcRenderer.send('pin:move-by', dx, dy),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
