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
