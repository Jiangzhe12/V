import React, { useState, useEffect, useCallback } from 'react'
import SearchBar from './SearchBar'
import ClipboardItem from './ClipboardItem'
import type { ClipboardEntry } from '../../types'

export default function ClipboardPopup() {
  const [entries, setEntries] = useState<ClipboardEntry[]>([])
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    window.api.getClipboardHistory().then(setEntries)
  }, [])

  useEffect(() => {
    const unsub = window.api.onClipboardUpdate((updated) => {
      setEntries(updated as ClipboardEntry[])
    })
    return unsub
  }, [])

  const filtered = query
    ? entries.filter((e) => e.text.toLowerCase().includes(query.toLowerCase()))
    : entries

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
