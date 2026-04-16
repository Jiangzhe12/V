import React, { useRef, useEffect } from 'react'

interface SearchBarProps {
  query: string
  onChange: (query: string) => void
}

export default function SearchBar({ query, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
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
