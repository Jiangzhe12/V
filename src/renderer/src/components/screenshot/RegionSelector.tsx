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

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export default function RegionSelector({
  screenshotDataUrl,
  onConfirm,
  onCancel
}: RegionSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [region, setRegion] = useState<Region | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, region: { x: 0, y: 0, width: 0, height: 0 } })

  const isInsideRegion = useCallback(
    (clientX: number, clientY: number) => {
      if (!region) return false
      return (
        clientX >= region.x &&
        clientX <= region.x + region.width &&
        clientY >= region.y &&
        clientY <= region.y + region.height
      )
    },
    [region]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeHandle) {
        // Starting resize
        resizeStart.current = { x: e.clientX, y: e.clientY, region: { ...region! } }
        return
      }

      if (region && isInsideRegion(e.clientX, e.clientY)) {
        // Start dragging existing selection
        setIsDragging(true)
        dragOffset.current = { x: e.clientX - region.x, y: e.clientY - region.y }
        return
      }

      // Start new selection
      setIsDrawing(true)
      setStartPoint({ x: e.clientX, y: e.clientY })
      setRegion(null)
    },
    [region, activeHandle, isInsideRegion]
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
      } else if (activeHandle && region) {
        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y
        const r = resizeStart.current.region
        const updated = { ...r }

        if (activeHandle.includes('w')) {
          updated.x = r.x + dx
          updated.width = r.width - dx
        }
        if (activeHandle.includes('e')) {
          updated.width = r.width + dx
        }
        if (activeHandle.includes('n')) {
          updated.y = r.y + dy
          updated.height = r.height - dy
        }
        if (activeHandle.includes('s')) {
          updated.height = r.height + dy
        }

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
    [isDrawing, isDragging, activeHandle, startPoint, region]
  )

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setIsDragging(false)
    setActiveHandle(null)
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
      style={{ cursor: isDrawing ? 'crosshair' : region ? 'default' : 'crosshair' }}
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

      {/* Selection region */}
      {region && region.width > 0 && region.height > 0 && (
        <>
          <div
            className="absolute border-2 border-[#5b9cf5]"
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              cursor: isDragging ? 'grabbing' : 'move',
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
                  className="absolute w-2 h-2 bg-[#5b9cf5] rounded-sm z-10"
                  style={{ ...h.style, position: 'absolute' }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    setActiveHandle(h.pos)
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
