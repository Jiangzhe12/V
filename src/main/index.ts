import { app, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

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
    // Will toggle clipboard popup in Task 4
  })
}

app.whenReady().then(() => {
  app.dock?.hide()
  createTray()
})

app.on('window-all-closed', () => {
  // Don't quit — menu bar app
})
