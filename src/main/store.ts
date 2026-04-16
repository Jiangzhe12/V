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
  const filtered = history.filter((e) => e.text !== entry.text)
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
