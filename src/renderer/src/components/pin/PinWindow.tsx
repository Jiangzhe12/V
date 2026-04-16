import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function PinWindow() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(1)
  const [scale, setScale] = useState(1)
  const [showToolbar, setShowToolbar] = useState(false)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const unsub = window.api.onPinInit((_pinId, dataUrl) => {
      setImageDataUrl(dataUrl)
    })
    return unsub
  }, [])

  // Drag to move — use IPC to move the window
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    lastPos.current = { x: e.screenX, y: e.screenY }
  }, [])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      const dx = e.screenX - lastPos.current.x
      const dy = e.screenY - lastPos.current.y
      lastPos.current = { x: e.screenX, y: e.screenY }
      // Use IPC to move window
      window.api.movePinWindow(dx, dy)
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

  // Scroll: resize (normal scroll) or opacity (Ctrl+scroll)
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.ctrlKey) {
        setOpacity((prev) => Math.max(0.1, Math.min(1, prev - e.deltaY * 0.005)))
      } else {
        setScale((prev) => Math.max(0.2, Math.min(5, prev * (e.deltaY > 0 ? 0.95 : 1.05))))
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  const handleDoubleClick = useCallback(() => {
    window.api.closePin()
  }, [])

  if (!imageDataUrl) return null

  return (
    <div
      className="relative select-none cursor-grab active:cursor-grabbing"
      style={{ opacity }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      <img
        src={imageDataUrl}
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      />

      {showToolbar && (
        <div className="absolute -top-7 right-0 flex gap-0.5 bg-[#1a1a2e] rounded-md px-1.5 py-0.5 shadow-lg">
          <button
            className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-red-400 rounded transition-colors"
            title="关闭 (双击)"
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
