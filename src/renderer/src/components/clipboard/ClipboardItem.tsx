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
