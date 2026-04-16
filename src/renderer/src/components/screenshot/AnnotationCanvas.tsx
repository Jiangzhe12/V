import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationTool, Point, RectAnnotation, ArrowAnnotation, TextAnnotation, PenAnnotation } from '../../types'
import type { Region } from './RegionSelector'
import { drawRect } from './tools/RectTool'
import { drawArrow } from './tools/ArrowTool'
import { drawText } from './tools/TextTool'
import { drawPen } from './tools/PenTool'
import Toolbar from './Toolbar'

interface AnnotationCanvasProps {
  screenshotDataUrl: string
  region: Region
  onDone: (action: 'save' | 'copy' | 'pin', imageDataUrl: string) => void
  onCancel: () => void
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation): void {
  ctx.save()
  switch (ann.tool) {
    case 'rect':
      drawRect(ctx, ann as RectAnnotation)
      break
    case 'arrow':
      drawArrow(ctx, ann as ArrowAnnotation)
      break
    case 'text':
      drawText(ctx, ann as TextAnnotation)
      break
    case 'pen':
      drawPen(ctx, ann as PenAnnotation)
      break
  }
  ctx.restore()
}

export default function AnnotationCanvas({
  screenshotDataUrl,
  region,
  onDone,
  onCancel
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const isDrawingRef = useRef(false)
  const currentAnnRef = useRef<Annotation | null>(null)

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [undoStack, setUndoStack] = useState<Annotation[][]>([])
  const [redoStack, setRedoStack] = useState<Annotation[][]>([])

  const [activeTool, setActiveTool] = useState<AnnotationTool>('rect')
  const [activeColor, setActiveColor] = useState('#ff4757')
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(2)

  // Text input state
  const [textInput, setTextInput] = useState<{ position: Point; value: string } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // Load screenshot image
  useEffect(() => {
    const img = new Image()
    img.src = screenshotDataUrl
    img.onload = () => {
      imgRef.current = img
      redraw(annotations, null)
    }
  }, [screenshotDataUrl])

  const getScaleX = useCallback(() => {
    const img = imgRef.current
    if (!img) return 1
    return img.naturalWidth / window.innerWidth
  }, [])

  const getScaleY = useCallback(() => {
    const img = imgRef.current
    if (!img) return 1
    return img.naturalHeight / window.innerHeight
  }, [])

  const redraw = useCallback(
    (anns: Annotation[], inProgress: Annotation | null) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw cropped screenshot
      ctx.drawImage(
        img,
        region.x * getScaleX(),
        region.y * getScaleY(),
        region.width * getScaleX(),
        region.height * getScaleY(),
        0,
        0,
        region.width,
        region.height
      )

      // Draw committed annotations
      for (const ann of anns) {
        drawAnnotation(ctx, ann)
      }

      // Draw in-progress annotation
      if (inProgress) {
        drawAnnotation(ctx, inProgress)
      }
    },
    [region, getScaleX, getScaleY]
  )

  // Redraw whenever annotations change
  useEffect(() => {
    redraw(annotations, currentAnnRef.current)
  }, [annotations, redraw])

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return
      const pt = getCanvasPoint(e)

      if (activeTool === 'text') {
        // Show text input at click position
        setTextInput({ position: pt, value: '' })
        return
      }

      isDrawingRef.current = true

      if (activeTool === 'rect') {
        currentAnnRef.current = {
          tool: 'rect',
          id: nanoid(),
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          start: pt,
          end: pt
        } as RectAnnotation
      } else if (activeTool === 'arrow') {
        currentAnnRef.current = {
          tool: 'arrow',
          id: nanoid(),
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          start: pt,
          end: pt
        } as ArrowAnnotation
      } else if (activeTool === 'pen') {
        currentAnnRef.current = {
          tool: 'pen',
          id: nanoid(),
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          points: [pt]
        } as PenAnnotation
      }
    },
    [activeTool, activeColor, activeStrokeWidth]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !currentAnnRef.current) return
      const pt = getCanvasPoint(e)

      if (activeTool === 'rect' || activeTool === 'arrow') {
        currentAnnRef.current = { ...currentAnnRef.current, end: pt } as RectAnnotation | ArrowAnnotation
      } else if (activeTool === 'pen') {
        const pen = currentAnnRef.current as PenAnnotation
        currentAnnRef.current = { ...pen, points: [...pen.points, pt] }
      }

      redraw(annotations, currentAnnRef.current)
    },
    [activeTool, annotations, redraw]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !currentAnnRef.current) return
    isDrawingRef.current = false

    const ann = currentAnnRef.current
    currentAnnRef.current = null

    // Don't commit degenerate annotations
    let skip = false
    if (ann.tool === 'rect' || ann.tool === 'arrow') {
      const a = ann as RectAnnotation | ArrowAnnotation
      if (Math.abs(a.end.x - a.start.x) < 2 && Math.abs(a.end.y - a.start.y) < 2) skip = true
    } else if (ann.tool === 'pen') {
      if ((ann as PenAnnotation).points.length < 2) skip = true
    }

    if (!skip) {
      setUndoStack((prev) => [...prev, annotations])
      setRedoStack([])
      setAnnotations((prev) => [...prev, ann])
    } else {
      redraw(annotations, null)
    }
  }, [annotations, redraw])

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const last = newStack.pop()!
      setRedoStack((r) => [...r, annotations])
      setAnnotations(last)
      return newStack
    })
  }, [annotations])

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const next = newStack.pop()!
      setUndoStack((u) => [...u, annotations])
      setAnnotations(next)
      return newStack
    })
  }, [annotations])

  const commitTextInput = useCallback(() => {
    if (!textInput) return
    const { position, value } = textInput
    setTextInput(null)
    if (value.trim()) {
      const ann: TextAnnotation = {
        tool: 'text',
        id: nanoid(),
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        position,
        text: value,
        fontSize: 18
      }
      setUndoStack((prev) => [...prev, annotations])
      setRedoStack([])
      setAnnotations((prev) => [...prev, ann])
    }
  }, [textInput, activeColor, activeStrokeWidth, annotations])

  // Focus text input when shown
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [textInput])

  const getExportDataUrl = useCallback((): string => {
    // Temporarily draw everything (text input might be pending)
    if (textInput && textInput.value.trim()) {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      const pendingText: TextAnnotation = {
        tool: 'text',
        id: nanoid(),
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        position: textInput.position,
        text: textInput.value,
        fontSize: 18
      }
      const allAnns = [...annotations, pendingText]
      redraw(allAnns, null)
      const dataUrl = canvas.toDataURL('image/png')
      redraw(annotations, null)
      return dataUrl
    }
    return canvasRef.current!.toDataURL('image/png')
  }, [textInput, annotations, activeColor, activeStrokeWidth, redraw])

  const handleDone = useCallback(
    (action: 'save' | 'copy' | 'pin') => {
      // Commit any pending text input
      if (textInput && textInput.value.trim()) {
        commitTextInput()
      }
      // Use a small delay to ensure state has settled if text was committed
      requestAnimationFrame(() => {
        const dataUrl = getExportDataUrl()
        onDone(action, dataUrl)
      })
    },
    [textInput, commitTextInput, getExportDataUrl, onDone]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (textInput) {
          setTextInput(null)
        } else {
          onCancel()
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [textInput, onCancel, handleUndo, handleRedo])

  // Decide cursor based on active tool
  const canvasCursor =
    activeTool === 'text' ? 'text' : activeTool === 'pen' ? 'crosshair' : 'crosshair'

  // Toolbar positioning — try below region, fall back to above if no room
  const toolbarTopBelow = region.y + region.height + 12
  const toolbarFitsBelow = toolbarTopBelow + 48 <= window.innerHeight
  const toolbarTop = toolbarFitsBelow ? toolbarTopBelow : region.y - 12 - 48
  const toolbarLeft = Math.min(
    Math.max(region.x, 8),
    window.innerWidth - 560 - 8
  )

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      {/* Dark overlay around selected region */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

      {/* Cut-out: canvas sits exactly over the selected region */}
      <canvas
        ref={canvasRef}
        width={region.width}
        height={region.height}
        style={{
          position: 'absolute',
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
          cursor: canvasCursor,
          display: 'block',
          // Canvas itself clears the dark overlay visually via its own content
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Text input overlay */}
      {textInput && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTextInput()
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              setTextInput(null)
            }
          }}
          onBlur={commitTextInput}
          style={{
            position: 'absolute',
            left: region.x + textInput.position.x,
            top: region.y + textInput.position.y,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: activeColor,
            font: `bold 18px -apple-system, BlinkMacSystemFont, sans-serif`,
            minWidth: 100,
            caretColor: activeColor,
            zIndex: 10000
          }}
          placeholder="Type text..."
        />
      )}

      {/* Toolbar */}
      <div
        style={{
          position: 'absolute',
          left: toolbarLeft,
          top: toolbarTop,
          zIndex: 10001
        }}
      >
        <Toolbar
          activeTool={activeTool}
          activeColor={activeColor}
          activeStrokeWidth={activeStrokeWidth}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
          onStrokeWidthChange={setActiveStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={() => handleDone('save')}
          onCopy={() => handleDone('copy')}
          onPin={() => handleDone('pin')}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}
