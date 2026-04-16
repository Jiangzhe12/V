import { BrowserWindow, screen, nativeImage } from 'electron'
import { join } from 'path'
import { captureAllScreens } from './screenshot'

let screenshotWindows: BrowserWindow[] = []
const pinWindows: Map<string, BrowserWindow> = new Map()

function loadRendererPage(win: BrowserWindow, page: string): void {
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${page}`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${page}`))
  }
}

export async function startScreenshot(): Promise<void> {
  closeScreenshotWindows()

  const captures = await captureAllScreens()

  for (const capture of captures) {
    const { display } = capture
    const { x, y, width, height } = display.bounds

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      fullscreen: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js')
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')

    win.webContents.once('did-finish-load', () => {
      win.webContents.send('screenshot:data', capture.dataUrl, {
        x,
        y,
        width,
        height,
        scaleFactor: display.scaleFactor
      })
    })

    loadRendererPage(win, 'screenshot.html')
    screenshotWindows.push(win)
  }
}

export function closeScreenshotWindows(): void {
  for (const win of screenshotWindows) {
    if (!win.isDestroyed()) win.close()
  }
  screenshotWindows = []
}

export function createPinWindow(imageDataUrl: string): void {
  const img = nativeImage.createFromDataURL(imageDataUrl)
  const { width: imgWidth, height: imgHeight } = img.getSize()

  const maxW = 600
  const maxH = 400
  const scale = Math.min(1, maxW / imgWidth, maxH / imgHeight)
  const width = Math.round(imgWidth * scale)
  const height = Math.round(imgHeight * scale)

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize
  const x = Math.round((screenW - width) / 2)
  const y = Math.round((screenH - height) / 2)

  const pinId = `pin-${Date.now()}`

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  win.setAlwaysOnTop(true, 'floating')

  pinWindows.set(pinId, win)

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('pin:init', pinId, imageDataUrl)
  })

  win.on('closed', () => {
    pinWindows.delete(pinId)
  })

  loadRendererPage(win, 'pin.html')
}

export function closePinWindow(winWebContents: Electron.WebContents): void {
  for (const [id, win] of pinWindows) {
    if (win.webContents === winWebContents) {
      win.close()
      pinWindows.delete(id)
      break
    }
  }
}
