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
  onPinInit: (callback: (pinId: string, imageDataUrl: string) => void) => () => void
  closePin: () => void

  // Settings
  getSettings: () => Promise<AppSettings>
}

declare global {
  interface Window {
    api: VApi
  }
}
