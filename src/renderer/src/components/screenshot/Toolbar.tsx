import React from 'react'
import type { AnnotationTool } from '../../types'

interface ToolbarProps {
  activeTool: AnnotationTool
  activeColor: string
  activeStrokeWidth: number
  canUndo: boolean
  canRedo: boolean
  onToolChange: (tool: AnnotationTool) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onCopy: () => void
  onPin: () => void
  onCancel: () => void
}

const COLORS = ['#ff4757', '#2ed573', '#5b9cf5', '#ffa502', '#ffffff']
const STROKE_WIDTHS = [2, 4, 6]

const TOOL_ICONS: Record<AnnotationTool, React.ReactNode> = {
  rect: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="13" x2="13" y2="3" />
      <polyline points="7,3 13,3 13,9" fill="none" />
    </svg>
  ),
  text: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <text x="2" y="13" fontSize="12" fontWeight="bold" fontFamily="serif">T</text>
    </svg>
  ),
  pen: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  )
}

export default function Toolbar({
  activeTool,
  activeColor,
  activeStrokeWidth,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onSave,
  onCopy,
  onPin,
  onCancel
}: ToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl select-none"
      style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        {(['rect', 'arrow', 'text', 'pen'] as AnnotationTool[]).map((tool) => (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            title={tool.charAt(0).toUpperCase() + tool.slice(1)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              activeTool === tool
                ? 'bg-white/10 text-[#5b9cf5]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {TOOL_ICONS[tool]}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Color dots */}
      <div className="flex items-center gap-1">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            title={color}
            className="w-5 h-5 rounded-full transition-all hover:scale-110 flex items-center justify-center"
            style={{
              background: color,
              border: activeColor === color ? '2px solid white' : '2px solid transparent',
              boxShadow: activeColor === color ? '0 0 0 1px rgba(0,0,0,0.5)' : 'none'
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Stroke widths */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => onStrokeWidthChange(w)}
            title={`Stroke ${w}px`}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              activeStrokeWidth === w
                ? 'bg-white/10'
                : 'hover:bg-white/5'
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: w + 4, height: w + 4, opacity: activeStrokeWidth === w ? 1 : 0.5 }}
            />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
            canUndo ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 7a5 5 0 1 0 1.5-3.5L2 2" />
            <polyline points="2,2 2,5 5,5" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
            canRedo ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 7a5 5 0 1 1-1.5-3.5L12 2" />
            <polyline points="12,2 12,5 9,5" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCopy}
          title="Copy to clipboard"
          className="px-2.5 h-7 flex items-center gap-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="8" height="8" rx="1" />
            <path d="M9 4V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
          </svg>
          Copy
        </button>
        <button
          onClick={onPin}
          title="Pin to screen"
          className="px-2.5 h-7 flex items-center gap-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="6.5" y1="8" x2="6.5" y2="12" />
            <path d="M4 8h5V5l2-3H2l2 3v3z" />
          </svg>
          Pin
        </button>
        <button
          onClick={onSave}
          title="Save to file"
          className="px-2.5 h-7 flex items-center gap-1.5 rounded-lg text-xs text-white transition-all font-medium"
          style={{ background: '#5b9cf5' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10h9V3.5L9.5 2H2v8z" />
            <rect x="4" y="2" width="4" height="3" />
            <rect x="3" y="7" width="7" height="3" />
          </svg>
          Save
        </button>
        <button
          onClick={onCancel}
          title="Cancel (Esc)"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all ml-0.5"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  )
}
