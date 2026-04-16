import { clipboard } from 'electron'
import { exec } from 'child_process'
import { addClipboardEntry } from './store'
import type { ClipboardEntry } from '../renderer/src/types'

let lastText = ''
let intervalId: ReturnType<typeof setInterval> | null = null
let onChangeCallback: ((entries: ClipboardEntry[]) => void) | null = null

function getFrontmostApp(): Promise<string> {
  return new Promise((resolve) => {
    exec(
      `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      (err, stdout) => {
        resolve(err ? '' : stdout.trim())
      }
    )
  })
}

export function startClipboardMonitor(
  onChange: (entries: ClipboardEntry[]) => void
): void {
  onChangeCallback = onChange
  lastText = clipboard.readText()

  intervalId = setInterval(async () => {
    const currentText = clipboard.readText().trim()

    if (currentText && currentText !== lastText) {
      lastText = currentText

      const sourceApp = await getFrontmostApp()

      const entry: ClipboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: currentText,
        timestamp: Date.now(),
        sourceApp: sourceApp || undefined
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
  lastText = text
}
