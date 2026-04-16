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
  lastText = text
}
