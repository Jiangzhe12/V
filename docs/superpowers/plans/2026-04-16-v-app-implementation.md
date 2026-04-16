# V App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop app combining clipboard history management (like Maccy) and screenshot/annotation/pin tools (like Snipaste) in a single menu-bar app.

**Architecture:** Menu-bar Electron app with a main process handling Tray, clipboard polling, global shortcuts, and window management. Three renderer entry points: clipboard popup, screenshot overlay (with annotation), and pin floating windows. IPC bridges main ↔ renderer via contextBridge preload.

**Tech Stack:** Electron 33, electron-vite 3, Vite 6, React 19, TypeScript 5.7, Zustand 5, Tailwind CSS 3.4, electron-store 10, Yarn PnP, electron-builder (macOS)

**Design Spec:** `docs/superpowers/specs/2026-04-16-v-app-design.md`

**Reference Project:** `/Users/jiangzhe/App-zhe/TodoList-zhe/` — same tech stack, use its configs as template.

---

## File Structure

```
V/
├── src/
│   ├── main/
│   │   ├── index.ts                # App lifecycle, Tray, global shortcuts
│   │   ├── clipboard-monitor.ts    # Clipboard polling (~500ms)
│   │   ├── window-manager.ts       # Create/manage all windows
│   │   ├── screenshot.ts           # desktopCapturer logic
│   │   ├── store.ts                # electron-store init & helpers
│   │   └── ipc-handlers.ts         # IPC message handlers
│   ├── preload/
│   │   └── index.ts                # contextBridge API
│   └── renderer/
│       ├── clipboard.html          # Clipboard popup entry
│       ├── screenshot.html         # Screenshot overlay entry
│       ├── pin.html                # Pin window entry
│       └── src/
│           ├── clipboard-entry.tsx  # Clipboard React root
│           ├── screenshot-entry.tsx # Screenshot React root
│           ├── pin-entry.tsx        # Pin React root
│           ├── types.ts            # Shared TypeScript types
│           ├── components/
│           │   ├── clipboard/
│           │   │   ├── ClipboardPopup.tsx
│           │   │   ├── ClipboardItem.tsx
│           │   │   └── SearchBar.tsx
│           │   ├── screenshot/
│           │   │   ├── ScreenshotOverlay.tsx
│           │   │   ├── RegionSelector.tsx
│           │   │   ├── SizeIndicator.tsx
│           │   │   ├── AnnotationCanvas.tsx
│           │   │   ├── Toolbar.tsx
│           │   │   └── tools/
│           │   │       ├── RectTool.ts
│           │   │       ├── ArrowTool.ts
│           │   │       ├── TextTool.ts
│           │   │       └── PenTool.ts
│           │   └── pin/
│           │       └── PinWindow.tsx
│           └── styles/
│               └── index.css
├── resources/
│   └── iconTemplate.png            # Menu bar icon (18x18 template)
├── electron.vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── package.json
└── .gitignore
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `tailwind.config.js`, `postcss.config.js`
- Create: `.gitignore`
- Create: `resources/iconTemplate.png`

- [ ] **Step 1: Initialize Yarn project**

```bash
cd /Users/jiangzhe/App-zhe/V
corepack enable
yarn init -2
```

- [ ] **Step 2: Create package.json**

Overwrite the generated `package.json` with:

```json
{
  "name": "v-app",
  "version": "1.0.0",
  "description": "Clipboard manager + Screenshot tool",
  "author": "jiangzhe",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "build:unpack": "yarn build && electron-builder --dir",
    "build:mac": "yarn build && electron-builder --mac"
  },
  "dependencies": {
    "date-fns": "^4.1.0",
    "electron-store": "^10.0.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@electron-toolkit/preload": "^3.0.1",
    "@electron-toolkit/utils": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "electron-vite": "^3.0.0",
    "postcss": "^8.5.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.0.0"
  },
  "build": {
    "appId": "com.v-app",
    "productName": "V",
    "electronVersion": "33.4.11",
    "mac": {
      "target": "dir",
      "icon": "resources/icon.icns"
    },
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*"
    ]
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
yarn install
```

- [ ] **Step 4: Create electron.vite.config.ts**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function electronRendererHtmlPlugin(): Plugin {
  return {
    name: 'electron-renderer-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/ crossorigin/g, '')
        .replace(/<script type="module"/g, '<script defer')
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          clipboard: resolve(__dirname, 'src/renderer/clipboard.html'),
          screenshot: resolve(__dirname, 'src/renderer/screenshot.html'),
          pin: resolve(__dirname, 'src/renderer/pin.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), electronRendererHtmlPlugin()]
  }
})
```

- [ ] **Step 5: Create TypeScript configs**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "electron.vite.config.ts",
    "src/main/**/*",
    "src/preload/**/*"
  ]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "rootDir": "./src/renderer/src",
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@renderer/*": ["./src/renderer/src/*"]
    }
  },
  "include": ["src/renderer/src/**/*"]
}
```

- [ ] **Step 6: Create Tailwind & PostCSS configs**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/*.html'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
out/
dist/
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
*.pnp.*
.DS_Store
.claude/
.superpowers/
```

- [ ] **Step 8: Create menu bar icon placeholder**

```bash
mkdir -p resources
```

Create `resources/iconTemplate.png` — a 18x18 transparent PNG with a simple "V" or clipboard icon shape. This is a macOS template image (the `Template` suffix in the filename tells macOS to auto-tint it for light/dark menu bar).

> Note: For development, any 18x18 PNG will work. Use a simple black shape on transparent background.

- [ ] **Step 9: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json tailwind.config.js postcss.config.js .gitignore resources/
git commit -m "feat: project scaffold with electron-vite + React + Tailwind"
```

---

## Task 2: Main Process Foundation — Tray, Store, App Lifecycle

**Files:**
- Create: `src/main/store.ts`
- Create: `src/main/index.ts`
- Create: `src/renderer/src/types.ts`

- [ ] **Step 1: Create shared types**

`src/renderer/src/types.ts`:

```typescript
// --- Clipboard ---

export interface ClipboardEntry {
  id: string
  text: string
  timestamp: number       // Date.now()
  sourceApp?: string      // e.g. "Chrome", "VS Code"
}

// --- Screenshot ---

export type AnnotationTool = 'rect' | 'arrow' | 'text' | 'pen'

export interface Point {
  x: number
  y: number
}

export interface AnnotationBase {
  id: string
  tool: AnnotationTool
  color: string
  strokeWidth: number
}

export interface RectAnnotation extends AnnotationBase {
  tool: 'rect'
  start: Point
  end: Point
}

export interface ArrowAnnotation extends AnnotationBase {
  tool: 'arrow'
  start: Point
  end: Point
}

export interface TextAnnotation extends AnnotationBase {
  tool: 'text'
  position: Point
  text: string
  fontSize: number
}

export interface PenAnnotation extends AnnotationBase {
  tool: 'pen'
  points: Point[]
}

export type Annotation = RectAnnotation | ArrowAnnotation | TextAnnotation | PenAnnotation

// --- Settings ---

export interface ShortcutSettings {
  clipboard: string       // default: 'Shift+CommandOrControl+C'
  screenshot: string      // default: 'F1'
  pin: string             // default: 'F3'
}

export interface AppSettings {
  shortcuts: ShortcutSettings
  historyLimit: number    // default: 200
  screenshotSavePath: string  // default: ~/Pictures/V/
  autoStart: boolean      // default: false
}

export interface StoreSchema {
  clipboardHistory: ClipboardEntry[]
  settings: AppSettings
}

// --- Window API (exposed via preload) ---

export interface VApi {
  // Clipboard
  getClipboardHistory: () => Promise<ClipboardEntry[]>
  onClipboardUpdate: (callback: (entries: ClipboardEntry[]) => void) => () => void
  pasteEntry: (id: string) => void
  deleteEntry: (id: string) => void
  clearHistory: () => void

  // Screenshot
  onScreenshotData: (callback: (dataUrl: string, bounds: { x: number; y: number; width: number; height: number }) => void) => () => void
  screenshotDone: (action: 'save' | 'copy' | 'pin', imageDataUrl: string) => void
  cancelScreenshot: () => void

  // Pin
  getPinImageData: () => Promise<string>
  closePin: () => void

  // Settings
  getSettings: () => Promise<AppSettings>
}

declare global {
  interface Window {
    api: VApi
  }
}
```

- [ ] **Step 2: Create electron-store wrapper**

`src/main/store.ts`:

```typescript
import Store from 'electron-store'
import { join } from 'path'
import { app } from 'electron'
import type { ClipboardEntry, AppSettings, StoreSchema } from '../renderer/src/types'

const defaultSettings: AppSettings = {
  shortcuts: {
    clipboard: 'Shift+CommandOrControl+C',
    screenshot: 'F1',
    pin: 'F3'
  },
  historyLimit: 200,
  screenshotSavePath: join(app.getPath('pictures'), 'V'),
  autoStart: false
}

const store = new Store<StoreSchema>({
  defaults: {
    clipboardHistory: [],
    settings: defaultSettings
  }
})

export function getClipboardHistory(): ClipboardEntry[] {
  return store.get('clipboardHistory', [])
}

export function setClipboardHistory(entries: ClipboardEntry[]): void {
  store.set('clipboardHistory', entries)
}

export function addClipboardEntry(entry: ClipboardEntry): ClipboardEntry[] {
  const history = getClipboardHistory()
  const settings = getSettings()

  // Deduplicate: remove existing entry with same text
  const filtered = history.filter((e) => e.text !== entry.text)

  // Prepend new entry
  const updated = [entry, ...filtered].slice(0, settings.historyLimit)
  setClipboardHistory(updated)
  return updated
}

export function deleteClipboardEntry(id: string): ClipboardEntry[] {
  const updated = getClipboardHistory().filter((e) => e.id !== id)
  setClipboardHistory(updated)
  return updated
}

export function clearClipboardHistory(): ClipboardEntry[] {
  setClipboardHistory([])
  return []
}

export function getSettings(): AppSettings {
  return store.get('settings', defaultSettings)
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated = { ...current, ...partial }
  store.set('settings', updated)
  return updated
}
```

- [ ] **Step 3: Create main process entry with Tray**

`src/main/index.ts`:

```typescript
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

  // Left-click toggles clipboard popup (will be wired in Task 5)
  tray.on('click', () => {
    // TODO: toggle clipboard popup
  })
}

app.whenReady().then(() => {
  // Hide dock icon — this is a menu-bar-only app
  app.dock?.hide()

  createTray()
})

app.on('window-all-closed', () => {
  // Don't quit when all windows close — app lives in menu bar
})
```

- [ ] **Step 4: Verify the app starts**

```bash
yarn dev
```

Expected: App starts, menu bar shows the V icon, right-click shows context menu with "关于 V" and "退出". No dock icon visible.

- [ ] **Step 5: Commit**

```bash
git add src/main/store.ts src/main/index.ts src/renderer/src/types.ts
git commit -m "feat: main process with Tray, electron-store, and shared types"
```

---

## Task 3: Preload & Multi-Window Renderer Setup

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/renderer/clipboard.html`
- Create: `src/renderer/screenshot.html`
- Create: `src/renderer/pin.html`
- Create: `src/renderer/src/styles/index.css`
- Create: `src/renderer/src/clipboard-entry.tsx`
- Create: `src/renderer/src/screenshot-entry.tsx`
- Create: `src/renderer/src/pin-entry.tsx`

- [ ] **Step 1: Create preload script**

`src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Clipboard
  getClipboardHistory: () => ipcRenderer.invoke('clipboard:get-history'),
  onClipboardUpdate: (callback: (_event: unknown, entries: unknown[]) => void) => {
    ipcRenderer.on('clipboard:updated', callback)
    return () => ipcRenderer.removeListener('clipboard:updated', callback)
  },
  pasteEntry: (id: string) => ipcRenderer.send('clipboard:paste', id),
  deleteEntry: (id: string) => ipcRenderer.send('clipboard:delete', id),
  clearHistory: () => ipcRenderer.send('clipboard:clear'),

  // Screenshot
  onScreenshotData: (callback: (_event: unknown, dataUrl: string, bounds: unknown) => void) => {
    ipcRenderer.on('screenshot:data', callback)
    return () => ipcRenderer.removeListener('screenshot:data', callback)
  },
  screenshotDone: (action: string, imageDataUrl: string) =>
    ipcRenderer.send('screenshot:done', action, imageDataUrl),
  cancelScreenshot: () => ipcRenderer.send('screenshot:cancel'),

  // Pin
  getPinImageData: () => ipcRenderer.invoke('pin:get-image'),
  closePin: () => ipcRenderer.send('pin:close'),

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
```

- [ ] **Step 2: Create Tailwind CSS entry**

`src/renderer/src/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global styles for all windows */
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 3: Create HTML entry files**

`src/renderer/clipboard.html`:
```html
<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>V Clipboard</title>
  </head>
  <body class="bg-transparent">
    <div id="root"></div>
    <script type="module" src="./src/clipboard-entry.tsx"></script>
  </body>
</html>
```

`src/renderer/screenshot.html`:
```html
<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>V Screenshot</title>
  </head>
  <body class="bg-transparent">
    <div id="root"></div>
    <script type="module" src="./src/screenshot-entry.tsx"></script>
  </body>
</html>
```

`src/renderer/pin.html`:
```html
<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>V Pin</title>
  </head>
  <body class="bg-transparent">
    <div id="root"></div>
    <script type="module" src="./src/pin-entry.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create React entry files (placeholder)**

`src/renderer/src/clipboard-entry.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function ClipboardApp() {
  return <div className="text-white p-4">Clipboard Popup</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClipboardApp />
  </React.StrictMode>
)
```

`src/renderer/src/screenshot-entry.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function ScreenshotApp() {
  return <div>Screenshot Overlay</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenshotApp />
  </React.StrictMode>
)
```

`src/renderer/src/pin-entry.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function PinApp() {
  return <div>Pin Window</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PinApp />
  </React.StrictMode>
)
```

- [ ] **Step 5: Verify build succeeds**

```bash
yarn build
```

Expected: No TypeScript errors. Output generated in `out/` directory with `main/`, `preload/`, and `renderer/` subdirectories. Renderer output should contain `clipboard.html`, `screenshot.html`, and `pin.html`.

- [ ] **Step 6: Commit**

```bash
git add src/preload/ src/renderer/
git commit -m "feat: preload script and multi-window renderer entries"
```

---

## Task 4: Clipboard Monitor

**Files:**
- Create: `src/main/clipboard-monitor.ts`
- Create: `src/main/ipc-handlers.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Create clipboard monitor**

`src/main/clipboard-monitor.ts`:

```typescript
import { clipboard } from 'electron'
import { addClipboardEntry } from './store'
import type { ClipboardEntry } from '../renderer/src/types'

let lastText = ''
let intervalId: ReturnType<typeof setInterval> | null = null
let onChangeCallback: ((entries: ClipboardEntry[]) => void) | null = null

export function startClipboardMonitor(
  onChange: (entries: ClipboardEntry[]) => void
): void {
  onChangeCallback = onChange

  // Initialize with current clipboard content
  lastText = clipboard.readText()

  intervalId = setInterval(() => {
    const currentText = clipboard.readText().trim()

    if (currentText && currentText !== lastText) {
      lastText = currentText

      const entry: ClipboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: currentText,
        timestamp: Date.now()
      }

      const updated = addClipboardEntry(entry)
      onChangeCallback?.(updated)
    }
  }, 500)
}

export function stopClipboardMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function setLastText(text: string): void {
  // Call this after pasting to avoid re-capturing what we just wrote
  lastText = text
}
```

- [ ] **Step 2: Create IPC handlers**

`src/main/ipc-handlers.ts`:

```typescript
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
  // --- Clipboard ---

  ipcMain.handle('clipboard:get-history', () => {
    return getClipboardHistory()
  })

  ipcMain.on('clipboard:paste', (_event, id: string) => {
    const history = getClipboardHistory()
    const entry = history.find((e) => e.id === id)
    if (!entry) return

    // Write to system clipboard
    clipboard.writeText(entry.text)
    setLastText(entry.text)

    // Hide clipboard popup
    const win = getClipboardWindow()
    if (win) win.hide()

    // Simulate Cmd+V to paste into frontmost app
    // Small delay to ensure the clipboard window has hidden
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

  // --- Settings ---

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })
}
```

- [ ] **Step 3: Wire monitor and IPC into main process**

Update `src/main/index.ts`:

```typescript
import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'
import { startClipboardMonitor } from './clipboard-monitor'
import { registerIpcHandlers } from './ipc-handlers'

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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Hide when focus is lost
  clipboardWindow.on('blur', () => {
    clipboardWindow?.hide()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    clipboardWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/clipboard.html`)
  } else {
    clipboardWindow.loadFile(join(__dirname, '../renderer/clipboard.html'))
  }
}

app.whenReady().then(() => {
  app.dock?.hide()

  registerIpcHandlers(getClipboardWindow)
  createTray()
  createClipboardWindow()

  // Start clipboard monitoring — notify renderer on changes
  startClipboardMonitor((entries) => {
    if (clipboardWindow) {
      clipboardWindow.webContents.send('clipboard:updated', entries)
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit — menu bar app
})
```

- [ ] **Step 4: Verify clipboard monitoring works**

```bash
yarn dev
```

1. App starts with Tray icon
2. Click Tray icon — clipboard popup appears below it showing "Clipboard Popup" placeholder text
3. Copy some text in another app
4. Check DevTools console (Cmd+Option+I on the popup window) for `clipboard:updated` events

- [ ] **Step 5: Commit**

```bash
git add src/main/clipboard-monitor.ts src/main/ipc-handlers.ts src/main/index.ts
git commit -m "feat: clipboard monitor with IPC handlers and popup window"
```

---

## Task 5: Clipboard Popup UI

**Files:**
- Create: `src/renderer/src/components/clipboard/SearchBar.tsx`
- Create: `src/renderer/src/components/clipboard/ClipboardItem.tsx`
- Create: `src/renderer/src/components/clipboard/ClipboardPopup.tsx`
- Modify: `src/renderer/src/clipboard-entry.tsx`

- [ ] **Step 1: Create SearchBar component**

`src/renderer/src/components/clipboard/SearchBar.tsx`:

```tsx
import React, { useRef, useEffect } from 'react'

interface SearchBarProps {
  query: string
  onChange: (query: string) => void
}

export default function SearchBar({ query, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus when popup appears
    inputRef.current?.focus()
  }, [])

  return (
    <div className="px-3 py-2.5 border-b border-white/[0.08]">
      <div className="flex items-center gap-2 bg-[#2a2a3e] rounded-lg px-3 py-2">
        <span className="text-gray-500 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜索剪贴板历史..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ClipboardItem component**

`src/renderer/src/components/clipboard/ClipboardItem.tsx`:

```tsx
import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { ClipboardEntry } from '../../types'

interface ClipboardItemProps {
  entry: ClipboardEntry
  index: number
  isSelected: boolean
  onSelect: () => void
  onPaste: () => void
}

export default function ClipboardItem({
  entry,
  index,
  isSelected,
  onSelect,
  onPaste
}: ClipboardItemProps) {
  const timeAgo = formatDistanceToNow(entry.timestamp, {
    addSuffix: true,
    locale: zhCN
  })

  const isLongText = entry.text.length > 80

  return (
    <div
      className={`px-3.5 py-2.5 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#3b3b5c] border-l-[3px] border-l-[#7c5bf5]'
          : 'border-l-[3px] border-l-transparent hover:bg-white/[0.04]'
      } ${index > 0 ? 'border-b border-b-white/[0.04]' : ''}`}
      onClick={onSelect}
      onDoubleClick={onPaste}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] leading-[1.4] ${
              isSelected ? 'text-gray-200' : 'text-gray-400'
            } ${isLongText ? 'line-clamp-2' : 'truncate'}`}
          >
            {entry.text}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5">
            {timeAgo}
            {entry.sourceApp && ` · ${entry.sourceApp}`}
          </div>
        </div>
        {index < 9 && (
          <div className="text-[11px] bg-[#2a2a3e] text-[#7c5bf5] px-1.5 py-0.5 rounded flex-shrink-0">
            ⌘{index + 1}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ClipboardPopup component**

`src/renderer/src/components/clipboard/ClipboardPopup.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import SearchBar from './SearchBar'
import ClipboardItem from './ClipboardItem'
import type { ClipboardEntry } from '../../types'

export default function ClipboardPopup() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Load initial history
  useEffect(() => {
    window.api.getClipboardHistory().then(setEntries)
  }, [])

  // Listen for clipboard updates
  useEffect(() => {
    const unsub = window.api.onClipboardUpdate((_event, updated) => {
      setEntries(updated as ClipboardEntry[])
    })
    return unsub
  }, [])

  // Filter by search query
  const filtered = query
    ? entries.filter((e) => e.text.toLowerCase().includes(query.toLowerCase()))
    : entries

  // Clamp selection
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  }, [filtered.length, selectedIndex])

  const pasteEntry = useCallback(
    (index: number) => {
      const entry = filtered[index]
      if (entry) {
        window.api.pasteEntry(entry.id)
      }
    },
    [filtered]
  )

  const deleteEntry = useCallback(
    (index: number) => {
      const entry = filtered[index]
      if (entry) {
        window.api.deleteEntry(entry.id)
      }
    },
    [filtered]
  )

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(0, i - 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1))
          break
        case 'Enter':
          e.preventDefault()
          pasteEntry(selectedIndex)
          break
        case 'Backspace':
        case 'Delete':
          if (!query) {
            e.preventDefault()
            deleteEntry(selectedIndex)
          }
          break
      }

      // ⌘+1 through ⌘+9
      if (e.metaKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (idx < filtered.length) {
          pasteEntry(idx)
        }
      }

      // ⌘+Backspace: clear all
      if (e.metaKey && e.key === 'Backspace') {
        e.preventDefault()
        window.api.clearHistory()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, query, pasteEntry, deleteEntry])

  // Scroll selected item into view
  useEffect(() => {
    const el = document.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div className="h-screen flex flex-col bg-[#1e1e2e] rounded-xl overflow-hidden shadow-2xl">
      <SearchBar query={query} onChange={setQuery} />

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            {query ? '没有匹配结果' : '剪贴板历史为空'}
          </div>
        ) : (
          filtered.map((entry, index) => (
            <div key={entry.id} data-index={index}>
              <ClipboardItem
                entry={entry}
                index={index}
                isSelected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
                onPaste={() => pasteEntry(index)}
              />
            </div>
          ))
        )}
      </div>

      <div className="px-3.5 py-2 border-t border-white/[0.08] flex justify-between text-[11px] text-gray-600">
        <span>↑↓ 导航 · Enter 粘贴 · ⌫ 删除</span>
        <span>{filtered.length} / {entries.length}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update clipboard entry to use ClipboardPopup**

`src/renderer/src/clipboard-entry.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import ClipboardPopup from './components/clipboard/ClipboardPopup'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClipboardPopup />
  </React.StrictMode>
)
```

- [ ] **Step 5: Add date-fns locale import**

Note: `date-fns` is already in dependencies. The `zhCN` locale import in `ClipboardItem.tsx` provides Chinese relative time strings (e.g., "10 秒前", "2 分钟前").

- [ ] **Step 6: Verify clipboard popup UI**

```bash
yarn dev
```

1. Click Tray icon — popup shows with search bar, empty state, and footer
2. Copy text in another app — entries appear in the list
3. Arrow keys navigate the list
4. Selected item is highlighted with purple left border
5. Click outside popup — it hides
6. Click Tray icon again — it shows with preserved history

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/components/clipboard/ src/renderer/src/clipboard-entry.tsx
git commit -m "feat: clipboard popup UI with search, list, and keyboard navigation"
```

---

## Task 6: Clipboard Paste & Delete Integration

This task wires up the full paste-to-app flow and entry deletion.

**Files:**
- Modify: `src/main/ipc-handlers.ts` (already has paste logic)
- Verify integration end-to-end

- [ ] **Step 1: End-to-end verification**

```bash
yarn dev
```

1. Open a text editor (e.g., TextEdit or Notes)
2. Copy "hello world" from any source
3. Click Tray icon — "hello world" appears in popup
4. Press Enter — popup hides, "hello world" is pasted into the text editor
5. Copy "test 123" — it appears at the top of the list
6. Press ↓ then Delete — the selected entry is removed
7. ⌘+Backspace — all entries are cleared (list shows empty state)

> If `osascript` paste doesn't work, you may need to grant Accessibility permissions to the Electron app in System Settings → Privacy & Security → Accessibility.

- [ ] **Step 2: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: clipboard paste and delete integration"
```

---

## Task 7: Screenshot Capture & Overlay Window

**Files:**
- Create: `src/main/screenshot.ts`
- Create: `src/main/window-manager.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Create screenshot capture module**

`src/main/screenshot.ts`:

```typescript
import { desktopCapturer, screen } from 'electron'

export interface CapturedScreen {
  dataUrl: string
  display: Electron.Display
}

export async function captureAllScreens(): Promise<CapturedScreen[]> {
  const displays = screen.getAllDisplays()
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      // Use the largest display's size for high quality
      width: Math.max(...displays.map((d) => d.size.width * d.scaleFactor)),
      height: Math.max(...displays.map((d) => d.size.height * d.scaleFactor))
    }
  })

  return displays.map((display, index) => {
    const source = sources[index] || sources[0]
    return {
      dataUrl: source.thumbnail.toDataURL(),
      display
    }
  })
}
```

- [ ] **Step 2: Create window manager**

`src/main/window-manager.ts`:

```typescript
import { BrowserWindow, screen } from 'electron'
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
  // Close any existing screenshot windows
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
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')

    // Send screenshot data after the page loads
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
  // Determine initial size from image dimensions
  const img = require('electron').nativeImage.createFromDataURL(imageDataUrl)
  const { width: imgWidth, height: imgHeight } = img.getSize()

  // Cap initial size at 600x400, scale proportionally
  const maxW = 600
  const maxH = 400
  const scale = Math.min(1, maxW / imgWidth, maxH / imgHeight)
  const width = Math.round(imgWidth * scale)
  const height = Math.round(imgHeight * scale)

  // Position near center of primary display
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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')

  // Store image data for retrieval by the pin renderer
  pinWindows.set(pinId, win)

  // When renderer asks for image data, return it
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

export function closeAllPinWindows(): void {
  for (const [id, win] of pinWindows) {
    if (!win.isDestroyed()) win.close()
  }
  pinWindows.clear()
}
```

- [ ] **Step 3: Add screenshot and pin IPC handlers**

Append to `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain, clipboard, BrowserWindow, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  getClipboardHistory,
  deleteClipboardEntry,
  clearClipboardHistory,
  getSettings
} from './store'
import { setLastText } from './clipboard-monitor'
import {
  closeScreenshotWindows,
  createPinWindow,
  closePinWindow
} from './window-manager'

export function registerIpcHandlers(
  getClipboardWindow: () => BrowserWindow | null
): void {
  // --- Clipboard (same as before) ---

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

  // --- Settings ---

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })
}
```

- [ ] **Step 4: Wire screenshot trigger into main process**

Update `src/main/index.ts` — add global shortcut for screenshot and import window-manager:

```typescript
import { app, Tray, Menu, nativeImage, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { startClipboardMonitor } from './clipboard-monitor'
import { registerIpcHandlers } from './ipc-handlers'
import { startScreenshot, createPinWindow } from './window-manager'
import { getSettings } from './store'

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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
    // Pin from clipboard image
    const { clipboard: cb, nativeImage: ni } = require('electron')
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
```

- [ ] **Step 5: Verify screenshot window launches**

```bash
yarn dev
```

Press F1 — a full-screen overlay window should appear (currently blank/transparent since the screenshot renderer is a placeholder). Press Esc or close it via Activity Monitor for now.

- [ ] **Step 6: Commit**

```bash
git add src/main/screenshot.ts src/main/window-manager.ts src/main/index.ts src/main/ipc-handlers.ts
git commit -m "feat: screenshot capture, window manager, and global shortcuts"
```

---

## Task 8: Screenshot Overlay — Region Selection

**Files:**
- Create: `src/renderer/src/components/screenshot/RegionSelector.tsx`
- Create: `src/renderer/src/components/screenshot/SizeIndicator.tsx`
- Create: `src/renderer/src/components/screenshot/ScreenshotOverlay.tsx`
- Modify: `src/renderer/src/screenshot-entry.tsx`

- [ ] **Step 1: Create SizeIndicator component**

`src/renderer/src/components/screenshot/SizeIndicator.tsx`:

```tsx
import React from 'react'

interface SizeIndicatorProps {
  x: number
  y: number
  width: number
  height: number
}

export default function SizeIndicator({ x, y, width, height }: SizeIndicatorProps) {
  return (
    <div
      className="absolute bg-[#5b9cf5] text-white text-[11px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap"
      style={{ left: x, top: y - 24 }}
    >
      {Math.abs(width)} × {Math.abs(height)}
    </div>
  )
}
```

- [ ] **Step 2: Create RegionSelector component**

`src/renderer/src/components/screenshot/RegionSelector.tsx`:

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react'
import SizeIndicator from './SizeIndicator'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

interface RegionSelectorProps {
  screenshotDataUrl: string
  onConfirm: (region: Region) => void
  onCancel: () => void
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export default function RegionSelector({
  screenshotDataUrl,
  onConfirm,
  onCancel
}: RegionSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [region, setRegion] = useState<Region | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, region: { x: 0, y: 0, width: 0, height: 0 } })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (region && !resizeHandle) {
        // Check if click is inside the existing region for dragging
        if (
          e.clientX >= region.x &&
          e.clientX <= region.x + region.width &&
          e.clientY >= region.y &&
          e.clientY <= region.y + region.height
        ) {
          setIsDragging(true)
          dragOffset.current = { x: e.clientX - region.x, y: e.clientY - region.y }
          return
        }
      }

      if (resizeHandle) {
        resizeStart.current = { x: e.clientX, y: e.clientY, region: { ...region! } }
        return
      }

      // Start new selection
      setIsDrawing(true)
      setStartPoint({ x: e.clientX, y: e.clientY })
      setRegion(null)
    },
    [region, resizeHandle]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDrawing) {
        const x = Math.min(startPoint.x, e.clientX)
        const y = Math.min(startPoint.y, e.clientY)
        const width = Math.abs(e.clientX - startPoint.x)
        const height = Math.abs(e.clientY - startPoint.y)
        setRegion({ x, y, width, height })
      } else if (isDragging && region) {
        setRegion({
          ...region,
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        })
      } else if (resizeHandle && region) {
        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y
        const r = resizeStart.current.region

        const updated = { ...r }
        if (resizeHandle.includes('w')) {
          updated.x = r.x + dx
          updated.width = r.width - dx
        }
        if (resizeHandle.includes('e')) {
          updated.width = r.width + dx
        }
        if (resizeHandle.includes('n')) {
          updated.y = r.y + dy
          updated.height = r.height - dy
        }
        if (resizeHandle.includes('s')) {
          updated.height = r.height + dy
        }

        // Normalize negative dimensions
        if (updated.width < 0) {
          updated.x += updated.width
          updated.width = -updated.width
        }
        if (updated.height < 0) {
          updated.y += updated.height
          updated.height = -updated.height
        }

        setRegion(updated)
      }
    },
    [isDrawing, isDragging, resizeHandle, startPoint, region]
  )

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setIsDragging(false)
    setResizeHandle(null)
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (region && region.width > 10 && region.height > 10) {
      onConfirm(region)
    }
  }, [region, onConfirm])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === ' ') {
        // Space: select full screen
        e.preventDefault()
        onConfirm({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight })
      } else if (e.key === 'Enter' && region && region.width > 10 && region.height > 10) {
        onConfirm(region)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [region, onConfirm, onCancel])

  const handles: { pos: ResizeHandle; style: React.CSSProperties }[] = region
    ? [
        { pos: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
        { pos: 'n', style: { left: '50%', top: -4, transform: 'translateX(-50%)', cursor: 'n-resize' } },
        { pos: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
        { pos: 'e', style: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
        { pos: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
        { pos: 's', style: { left: '50%', bottom: -4, transform: 'translateX(-50%)', cursor: 's-resize' } },
        { pos: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
        { pos: 'w', style: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } }
      ]
    : []

  return (
    <div
      className="fixed inset-0 select-none"
      style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Screenshot as background */}
      <img
        src={screenshotDataUrl}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Selection region — clear window through the overlay */}
      {region && region.width > 0 && region.height > 0 && (
        <>
          {/* Clear region: show screenshot through */}
          <div
            className="absolute border-2 border-[#5b9cf5]"
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              boxShadow: `
                -${region.x}px 0 0 0 rgba(0,0,0,0.45),
                ${window.innerWidth - region.x - region.width}px 0 0 0 rgba(0,0,0,0.45),
                0 -${region.y}px 0 0 rgba(0,0,0,0.45),
                0 ${window.innerHeight - region.y - region.height}px 0 0 rgba(0,0,0,0.45)
              `
            }}
            onDoubleClick={handleDoubleClick}
          >
            {/* Resize handles */}
            {!isDrawing &&
              handles.map((h) => (
                <div
                  key={h.pos}
                  className="absolute w-2 h-2 bg-[#5b9cf5] rounded-sm"
                  style={{ ...h.style, position: 'absolute' }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setResizeHandle(h.pos)
                    resizeStart.current = { x: e.clientX, y: e.clientY, region: { ...region } }
                  }}
                />
              ))}
          </div>

          <SizeIndicator
            x={region.x}
            y={region.y}
            width={region.width}
            height={region.height}
          />
        </>
      )}

      {/* Help text */}
      <div className="absolute bottom-6 right-6 text-gray-400 text-[11px]">
        拖拽选区 · Enter/双击 确认 · Space 全屏 · Esc 取消
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ScreenshotOverlay component**

`src/renderer/src/components/screenshot/ScreenshotOverlay.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import RegionSelector, { type Region } from './RegionSelector'

type Phase = 'selecting' | 'annotating'

export default function ScreenshotOverlay() {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [region, setRegion] = useState<Region | null>(null)

  useEffect(() => {
    const unsub = window.api.onScreenshotData((_event, dataUrl) => {
      setScreenshotDataUrl(dataUrl as string)
    })
    return unsub
  }, [])

  const handleConfirmRegion = useCallback((r: Region) => {
    setRegion(r)
    setPhase('annotating')
  }, [])

  const handleCancel = useCallback(() => {
    window.api.cancelScreenshot()
  }, [])

  if (!screenshotDataUrl) {
    return <div className="fixed inset-0 bg-black/50" />
  }

  if (phase === 'selecting') {
    return (
      <RegionSelector
        screenshotDataUrl={screenshotDataUrl}
        onConfirm={handleConfirmRegion}
        onCancel={handleCancel}
      />
    )
  }

  // Annotation phase — placeholder, implemented in Task 9
  return (
    <div className="fixed inset-0">
      <img
        src={screenshotDataUrl}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/45" />
      {region && (
        <div
          className="absolute border-2 border-[#5b9cf5] bg-transparent"
          style={{ left: region.x, top: region.y, width: region.width, height: region.height }}
        >
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-sm px-4 py-2 rounded-lg">
            标注功能即将实现... (Esc 取消)
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update screenshot entry**

`src/renderer/src/screenshot-entry.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import ScreenshotOverlay from './components/screenshot/ScreenshotOverlay'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenshotOverlay />
  </React.StrictMode>
)
```

- [ ] **Step 5: Verify region selection**

```bash
yarn dev
```

1. Press F1 — full-screen overlay appears with frozen desktop screenshot
2. Drag to select a region — blue border appears, size indicator shows dimensions
3. Resize handles appear — drag them to adjust
4. Double-click or Enter confirms selection (shows "标注功能即将实现" placeholder)
5. Esc cancels and closes the overlay
6. Space selects full screen

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/screenshot/ src/renderer/src/screenshot-entry.tsx
git commit -m "feat: screenshot overlay with region selection, resize handles, and size indicator"
```

---

## Task 9: Annotation Tools

**Files:**
- Create: `src/renderer/src/components/screenshot/tools/RectTool.ts`
- Create: `src/renderer/src/components/screenshot/tools/ArrowTool.ts`
- Create: `src/renderer/src/components/screenshot/tools/TextTool.ts`
- Create: `src/renderer/src/components/screenshot/tools/PenTool.ts`
- Create: `src/renderer/src/components/screenshot/Toolbar.tsx`
- Create: `src/renderer/src/components/screenshot/AnnotationCanvas.tsx`
- Modify: `src/renderer/src/components/screenshot/ScreenshotOverlay.tsx`

- [ ] **Step 1: Create drawing tool renderers**

Each tool provides a `draw` function that renders onto a Canvas 2D context.

`src/renderer/src/components/screenshot/tools/RectTool.ts`:

```typescript
import type { RectAnnotation } from '../../../types'

export function drawRect(ctx: CanvasRenderingContext2D, ann: RectAnnotation): void {
  ctx.strokeStyle = ann.color
  ctx.lineWidth = ann.strokeWidth
  ctx.strokeRect(
    Math.min(ann.start.x, ann.end.x),
    Math.min(ann.start.y, ann.end.y),
    Math.abs(ann.end.x - ann.start.x),
    Math.abs(ann.end.y - ann.start.y)
  )
}
```

`src/renderer/src/components/screenshot/tools/ArrowTool.ts`:

```typescript
import type { ArrowAnnotation } from '../../../types'

export function drawArrow(ctx: CanvasRenderingContext2D, ann: ArrowAnnotation): void {
  const { start, end, color, strokeWidth } = ann
  const headLength = Math.max(10, strokeWidth * 4)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'

  // Line
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  // Arrowhead
  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
```

`src/renderer/src/components/screenshot/tools/TextTool.ts`:

```typescript
import type { TextAnnotation } from '../../../types'

export function drawText(ctx: CanvasRenderingContext2D, ann: TextAnnotation): void {
  ctx.fillStyle = ann.color
  ctx.font = `bold ${ann.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText(ann.text, ann.position.x, ann.position.y)
}
```

`src/renderer/src/components/screenshot/tools/PenTool.ts`:

```typescript
import type { PenAnnotation } from '../../../types'

export function drawPen(ctx: CanvasRenderingContext2D, ann: PenAnnotation): void {
  if (ann.points.length < 2) return

  ctx.strokeStyle = ann.color
  ctx.lineWidth = ann.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(ann.points[0].x, ann.points[0].y)
  for (let i = 1; i < ann.points.length; i++) {
    ctx.lineTo(ann.points[i].x, ann.points[i].y)
  }
  ctx.stroke()
}
```

- [ ] **Step 2: Create Toolbar component**

`src/renderer/src/components/screenshot/Toolbar.tsx`:

```tsx
import React from 'react'
import type { AnnotationTool } from '../../types'

const COLORS = ['#ff4757', '#2ed573', '#5b9cf5', '#ffa502', '#ffffff']
const STROKE_WIDTHS = [2, 4, 6]

interface ToolbarProps {
  activeTool: AnnotationTool
  activeColor: string
  activeStrokeWidth: number
  canUndo: boolean
  canRedo: boolean
  onToolChange: (tool: AnnotationTool) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onCopy: () => void
  onPin: () => void
  onCancel: () => void
}

const tools: { tool: AnnotationTool; icon: string; label: string }[] = [
  { tool: 'rect', icon: '▭', label: '矩形' },
  { tool: 'arrow', icon: '↗', label: '箭头' },
  { tool: 'text', icon: 'T', label: '文字' },
  { tool: 'pen', icon: '✎', label: '画笔' }
]

export default function Toolbar({
  activeTool,
  activeColor,
  activeStrokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onSave,
  onCopy,
  onPin,
  onCancel
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 bg-[#1a1a2e] rounded-xl px-2 py-1.5 shadow-2xl">
      {/* Tools */}
      {tools.map((t) => (
        <button
          key={t.tool}
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
            activeTool === t.tool
              ? 'bg-white/10 text-[#5b9cf5]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => onToolChange(t.tool)}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-700 mx-1.5" />

      {/* Colors */}
      {COLORS.map((c) => (
        <button
          key={c}
          className="w-9 h-9 flex items-center justify-center"
          onClick={() => onColorChange(c)}
        >
          <div
            className="w-5 h-5 rounded-full transition-all"
            style={{
              backgroundColor: c,
              border: activeColor === c ? '2px solid white' : '2px solid transparent',
              transform: activeColor === c ? 'scale(1.1)' : 'scale(1)'
            }}
          />
        </button>
      ))}

      <div className="w-px h-6 bg-gray-700 mx-1.5" />

      {/* Stroke width */}
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          className={`w-9 h-9 flex items-center justify-center rounded-lg ${
            activeStrokeWidth === w ? 'bg-white/10' : ''
          }`}
          onClick={() => onStrokeWidthChange(w)}
          title={`线宽 ${w}px`}
        >
          <div
            className="rounded-full bg-gray-400"
            style={{ width: w + 4, height: w + 4 }}
          />
        </button>
      ))}

      <div className="w-px h-6 bg-gray-700 mx-1.5" />

      {/* Undo/Redo */}
      <button
        className={`w-9 h-9 flex items-center justify-center rounded-lg text-base ${
          canUndo ? 'text-gray-400 hover:text-gray-200' : 'text-gray-700'
        }`}
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 ⌘Z"
      >
        ↩
      </button>
      <button
        className={`w-9 h-9 flex items-center justify-center rounded-lg text-base ${
          canRedo ? 'text-gray-400 hover:text-gray-200' : 'text-gray-700'
        }`}
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 ⌘⇧Z"
      >
        ↪
      </button>

      <div className="w-px h-6 bg-gray-700 mx-1.5" />

      {/* Actions */}
      <button
        className="h-9 px-3 rounded-lg bg-[#5b9cf5] text-white text-xs font-semibold hover:bg-[#4a8be4] transition-colors"
        onClick={onSave}
      >
        保存
      </button>
      <button
        className="h-9 px-3 rounded-lg bg-white/[0.08] text-gray-300 text-xs hover:bg-white/[0.12] transition-colors"
        onClick={onCopy}
      >
        复制
      </button>
      <button
        className="h-9 px-3 rounded-lg bg-white/[0.08] text-gray-300 text-xs hover:bg-white/[0.12] transition-colors"
        onClick={onPin}
      >
        贴图
      </button>
      <button
        className="h-9 px-3 rounded-lg text-gray-500 text-xs hover:text-gray-300 transition-colors"
        onClick={onCancel}
      >
        取消
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create AnnotationCanvas component**

`src/renderer/src/components/screenshot/AnnotationCanvas.tsx`:

```tsx
import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { Annotation, AnnotationTool, Point } from '../../types'
import Toolbar from './Toolbar'
import { drawRect } from './tools/RectTool'
import { drawArrow } from './tools/ArrowTool'
import { drawText } from './tools/TextTool'
import { drawPen } from './tools/PenTool'
import type { Region } from './RegionSelector'

interface AnnotationCanvasProps {
  screenshotDataUrl: string
  region: Region
  onDone: (action: 'save' | 'copy' | 'pin', imageDataUrl: string) => void
  onCancel: () => void
}

let nextId = 1

export default function AnnotationCanvas({
  screenshotDataUrl,
  region,
  onDone,
  onCancel
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [undoStack, setUndoStack] = useState<Annotation[][]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [activeColor, setActiveColor] = useState('#ff4757')
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [textInput, setTextInput] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0
  })
  const textInputRef = useRef<HTMLInputElement>(null)

  // Load the screenshot image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      renderCanvas()
    }
    img.src = screenshotDataUrl
  }, [screenshotDataUrl])

  // Re-render canvas when annotations change
  useEffect(() => {
    renderCanvas()
  }, [annotations, currentAnnotation])

  function renderCanvas() {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw cropped screenshot region
    ctx.drawImage(
      img,
      region.x * (img.naturalWidth / window.innerWidth),
      region.y * (img.naturalHeight / window.innerHeight),
      region.width * (img.naturalWidth / window.innerWidth),
      region.height * (img.naturalHeight / window.innerHeight),
      0,
      0,
      region.width,
      region.height
    )

    // Draw all committed annotations
    for (const ann of annotations) {
      drawAnnotation(ctx, ann)
    }

    // Draw in-progress annotation
    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation)
    }
  }

  function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
    switch (ann.tool) {
      case 'rect':
        drawRect(ctx, ann)
        break
      case 'arrow':
        drawArrow(ctx, ann)
        break
      case 'text':
        drawText(ctx, ann)
        break
      case 'pen':
        drawPen(ctx, ann)
        break
    }
  }

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e)

      if (activeTool === 'text') {
        setTextInput({ visible: true, x: point.x, y: point.y })
        setTimeout(() => textInputRef.current?.focus(), 0)
        return
      }

      setIsDrawing(true)

      const base = {
        id: `ann-${nextId++}`,
        color: activeColor,
        strokeWidth: activeStrokeWidth
      }

      if (activeTool === 'rect') {
        setCurrentAnnotation({ ...base, tool: 'rect', start: point, end: point })
      } else if (activeTool === 'arrow') {
        setCurrentAnnotation({ ...base, tool: 'arrow', start: point, end: point })
      } else if (activeTool === 'pen') {
        setCurrentAnnotation({ ...base, tool: 'pen', points: [point] })
      }
    },
    [activeTool, activeColor, activeStrokeWidth, getCanvasPoint]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !currentAnnotation) return
      const point = getCanvasPoint(e)

      if (currentAnnotation.tool === 'rect' || currentAnnotation.tool === 'arrow') {
        setCurrentAnnotation({ ...currentAnnotation, end: point })
      } else if (currentAnnotation.tool === 'pen') {
        setCurrentAnnotation({
          ...currentAnnotation,
          points: [...currentAnnotation.points, point]
        })
      }
    },
    [isDrawing, currentAnnotation, getCanvasPoint]
  )

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentAnnotation) {
      setUndoStack((prev) => [...prev, annotations])
      setAnnotations((prev) => [...prev, currentAnnotation])
      setCurrentAnnotation(null)
    }
    setIsDrawing(false)
  }, [isDrawing, currentAnnotation, annotations])

  const handleTextSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        const ann: Annotation = {
          id: `ann-${nextId++}`,
          tool: 'text',
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          position: { x: textInput.x, y: textInput.y },
          text: text.trim(),
          fontSize: 16
        }
        setUndoStack((prev) => [...prev, annotations])
        setAnnotations((prev) => [...prev, ann])
      }
      setTextInput({ visible: false, x: 0, y: 0 })
    },
    [activeColor, activeStrokeWidth, textInput, annotations]
  )

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      setAnnotations(undoStack[undoStack.length - 1])
      setUndoStack((prev) => prev.slice(0, -1))
    }
  }, [undoStack])

  const handleRedo = useCallback(() => {
    // Simple redo not implemented in this version — undo stack is one-way
  }, [])

  const exportImage = useCallback((): string => {
    const canvas = canvasRef.current!
    return canvas.toDataURL('image/png')
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.metaKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, handleUndo])

  return (
    <div className="fixed inset-0">
      {/* Screenshot background (dimmed) */}
      <img
        src={screenshotDataUrl}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Canvas positioned at the region */}
      <canvas
        ref={canvasRef}
        width={region.width}
        height={region.height}
        className="absolute border-2 border-[#5b9cf5] cursor-crosshair"
        style={{ left: region.x, top: region.y }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Text input overlay */}
      {textInput.visible && (
        <input
          ref={textInputRef}
          type="text"
          className="absolute bg-transparent text-base font-bold outline-none"
          style={{
            left: region.x + textInput.x,
            top: region.y + textInput.y,
            color: activeColor,
            caretColor: activeColor
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleTextSubmit(e.currentTarget.value)
            } else if (e.key === 'Escape') {
              setTextInput({ visible: false, x: 0, y: 0 })
            }
          }}
          onBlur={(e) => handleTextSubmit(e.currentTarget.value)}
        />
      )}

      {/* Toolbar below the region */}
      <div
        className="absolute flex justify-center"
        style={{
          left: region.x,
          top: region.y + region.height + 12,
          width: region.width
        }}
      >
        <Toolbar
          activeTool={activeTool}
          activeColor={activeColor}
          activeStrokeWidth={activeStrokeWidth}
          canUndo={undoStack.length > 0}
          canRedo={false}
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
          onStrokeWidthChange={setActiveStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={() => onDone('save', exportImage())}
          onCopy={() => onDone('copy', exportImage())}
          onPin={() => onDone('pin', exportImage())}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update ScreenshotOverlay to use AnnotationCanvas**

Replace the annotation placeholder in `src/renderer/src/components/screenshot/ScreenshotOverlay.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import RegionSelector, { type Region } from './RegionSelector'
import AnnotationCanvas from './AnnotationCanvas'

type Phase = 'selecting' | 'annotating'

export default function ScreenshotOverlay() {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [region, setRegion] = useState<Region | null>(null)

  useEffect(() => {
    const unsub = window.api.onScreenshotData((_event, dataUrl) => {
      setScreenshotDataUrl(dataUrl as string)
    })
    return unsub
  }, [])

  const handleConfirmRegion = useCallback((r: Region) => {
    setRegion(r)
    setPhase('annotating')
  }, [])

  const handleCancel = useCallback(() => {
    window.api.cancelScreenshot()
  }, [])

  const handleDone = useCallback((action: 'save' | 'copy' | 'pin', imageDataUrl: string) => {
    window.api.screenshotDone(action, imageDataUrl)
  }, [])

  if (!screenshotDataUrl) {
    return <div className="fixed inset-0 bg-black/50" />
  }

  if (phase === 'selecting') {
    return (
      <RegionSelector
        screenshotDataUrl={screenshotDataUrl}
        onConfirm={handleConfirmRegion}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <AnnotationCanvas
      screenshotDataUrl={screenshotDataUrl}
      region={region!}
      onDone={handleDone}
      onCancel={handleCancel}
    />
  )
}
```

- [ ] **Step 5: Verify annotation tools**

```bash
yarn dev
```

1. Press F1 → drag to select a region → Enter or double-click to confirm
2. Toolbar appears below the selection
3. Select rect tool → drag on canvas → red rectangle drawn
4. Select arrow tool → drag → arrow with arrowhead
5. Select text tool → click on canvas → type text → Enter to commit
6. Select pen tool → freehand draw
7. Change colors and stroke width — new annotations use updated settings
8. ⌘+Z undoes last annotation
9. Click "保存" — screenshot saved to ~/Pictures/V/
10. Click "复制" — screenshot copied to clipboard
11. Click "贴图" — triggers pin (verified in Task 11)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/screenshot/
git commit -m "feat: annotation canvas with rect, arrow, text, pen tools and toolbar"
```

---

## Task 10: Pin Window

**Files:**
- Create: `src/renderer/src/components/pin/PinWindow.tsx`
- Modify: `src/renderer/src/pin-entry.tsx`
- Modify: `src/preload/index.ts` (add pin:init listener)

- [ ] **Step 1: Update preload for pin init event**

Add to the `api` object in `src/preload/index.ts`:

```typescript
  // Pin
  onPinInit: (callback: (_event: unknown, pinId: string, imageDataUrl: string) => void) => {
    ipcRenderer.on('pin:init', callback)
    return () => ipcRenderer.removeListener('pin:init', callback)
  },
  closePin: () => ipcRenderer.send('pin:close'),
```

Update the VApi interface in `src/renderer/src/types.ts` — replace the `getPinImageData` line:

```typescript
  // Pin
  onPinInit: (callback: (pinId: string, imageDataUrl: string) => void) => () => void
  closePin: () => void
```

- [ ] **Step 2: Create PinWindow component**

`src/renderer/src/components/pin/PinWindow.tsx`:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function PinWindow() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(1)
  const [showToolbar, setShowToolbar] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const unsub = window.api.onPinInit((_event, _pinId, dataUrl) => {
      setImageDataUrl(dataUrl as string)
    })
    return unsub
  }, [])

  // Drag to move window
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.screenX, y: e.screenY }
  }, [])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      const dx = e.screenX - dragStart.current.x
      const dy = e.screenY - dragStart.current.y
      dragStart.current = { x: e.screenX, y: e.screenY }
      // Use Electron's window positioning
      const win = require('@electron/remote')?.getCurrentWindow?.()
      if (win) {
        const [x, y] = win.getPosition()
        win.setPosition(x + dx, y + dy)
      }
    }
    function handleMouseUp() {
      isDragging.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Scroll to resize, Ctrl+scroll for opacity
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.ctrlKey) {
        // Adjust opacity
        setOpacity((prev) => Math.max(0.1, Math.min(1, prev - e.deltaY * 0.005)))
      } else {
        // Resize window
        const scaleDelta = e.deltaY > 0 ? 0.95 : 1.05
        const el = containerRef.current
        if (el) {
          const img = el.querySelector('img')
          if (img) {
            const newWidth = Math.max(50, Math.round(img.width * scaleDelta))
            const newHeight = Math.max(50, Math.round(img.height * scaleDelta))
            img.style.width = `${newWidth}px`
            img.style.height = `${newHeight}px`
          }
        }
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // Double-click to close
  const handleDoubleClick = useCallback(() => {
    window.api.closePin()
  }, [])

  if (!imageDataUrl) return null

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ opacity }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      <img
        src={imageDataUrl}
        className="block max-w-none"
        draggable={false}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Mini toolbar on hover */}
      {showToolbar && (
        <div className="absolute -top-7 right-0 flex gap-0.5 bg-[#1a1a2e] rounded-md px-1 py-0.5 shadow-lg">
          <button
            className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-gray-200 rounded"
            title="关闭"
            onClick={(e) => {
              e.stopPropagation()
              window.api.closePin()
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update pin entry**

`src/renderer/src/pin-entry.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import PinWindow from './components/pin/PinWindow'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PinWindow />
  </React.StrictMode>
)
```

- [ ] **Step 4: Verify pin window**

```bash
yarn dev
```

1. Take a screenshot (F1 → select → Enter)
2. Click "贴图" on toolbar — floating pin window appears with the annotated screenshot
3. Drag to move the pin window
4. Scroll to resize
5. Ctrl+scroll to adjust transparency
6. Hover to see close button
7. Double-click to close
8. Copy an image to clipboard, then press F3 — pin created from clipboard image

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/pin/ src/renderer/src/pin-entry.tsx src/preload/index.ts src/renderer/src/types.ts
git commit -m "feat: pin floating window with drag, resize, opacity, and close"
```

---

## Task 11: Global Shortcuts & Settings Persistence

**Files:**
- Modify: `src/main/index.ts` (already has shortcuts, verify they work)
- Modify: `src/main/store.ts` (verify settings persistence)

- [ ] **Step 1: End-to-end shortcut verification**

```bash
yarn dev
```

1. Shift+Cmd+C → clipboard popup toggles
2. F1 → screenshot overlay appears
3. F3 → pin window created from clipboard image (if clipboard has an image)
4. All shortcuts work from any app (global)

- [ ] **Step 2: Verify settings persistence**

1. Quit the app (right-click Tray → 退出)
2. Re-launch with `yarn dev`
3. Clipboard history is preserved from previous session
4. Copy more text — it's added to the existing history

- [ ] **Step 3: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: global shortcuts and settings persistence verification"
```

---

## Task 12: Final Integration & Polish

**Files:**
- Verify all features work together end-to-end

- [ ] **Step 1: Full integration test**

Run through the complete verification checklist from the design spec:

**Clipboard:**
1. ✅ App starts, Tray icon visible, no Dock icon
2. ✅ Copy text → appears in popup
3. ✅ Shift+Cmd+C opens popup, keyboard nav, Enter pastes
4. ✅ Search filters history
5. ✅ Delete and clear work

**Screenshot:**
1. ✅ F1 triggers screenshot overlay
2. ✅ Drag to select region, size indicator shows
3. ✅ Enter confirms → annotation mode
4. ✅ Rect, arrow, text, pen tools work
5. ✅ ⌘+Z undoes
6. ✅ Save, copy, pin all work

**Pin:**
1. ✅ Pin window appears from annotation "贴图"
2. ✅ Drag, scroll resize, Ctrl+scroll opacity
3. ✅ Multiple pins coexist
4. ✅ Double-click closes
5. ✅ F3 pins from clipboard

- [ ] **Step 2: Build production app**

```bash
yarn build:mac
```

Expected: `dist/` contains the packaged macOS app.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: V app complete — clipboard manager + screenshot tool"
```

---

## Notes for Implementation

1. **Menu bar icon**: For development, create a simple 18x18 PNG. The `Template` suffix in `iconTemplate.png` tells macOS to auto-tint it for light/dark mode. A solid black "V" shape on transparent background works.

2. **Accessibility permissions**: The paste-via-osascript feature requires Accessibility permissions. On first use, macOS will prompt the user to grant this in System Settings → Privacy & Security → Accessibility.

3. **Screen recording permissions**: `desktopCapturer` requires Screen Recording permission. macOS will prompt on first use.

4. **Pin window drag**: Do NOT use `@electron/remote` — it's not in dependencies. Instead, use IPC for window positioning: add a `pin:move-by` handler in `ipc-handlers.ts` that calls `BrowserWindow.setPosition()`, expose `movePinWindow(dx, dy)` in the preload API, and call it from the PinWindow mousemove handler. This is the correct pattern matching the reference project.

5. **Multi-monitor**: The screenshot module creates one overlay per display. Test with external monitors if available.

6. **IPC callback event parameter**: All `ipcRenderer.on` callbacks receive `(event, ...args)` as their first argument. The preload exposes these callbacks as-is, so renderers must accept the event parameter (typically `_event`). Ensure VApi type signatures and actual usage stay consistent.

7. **Clipboard source app**: The spec mentions showing the source app name. Electron doesn't natively provide this info. This is marked optional in the spec — skip in the first version.

8. **Pin toolbar completeness**: The spec mentions "置顶切换" and "鼠标穿透切换" buttons in the pin mini toolbar. The current plan only implements a close button. Add these in the PinWindow toolbar: always-on-top toggle via IPC `pin:toggle-always-on-top`, and mouse passthrough toggle via IPC `pin:toggle-click-through` (using `win.setIgnoreMouseEvents()`).
