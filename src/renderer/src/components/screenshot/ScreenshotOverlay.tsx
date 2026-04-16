import React, { useState, useEffect, useCallback } from 'react'
import RegionSelector, { type Region } from './RegionSelector'

type Phase = 'selecting' | 'annotating'

export default function ScreenshotOverlay() {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [region, setRegion] = useState<Region | null>(null)

  useEffect(() => {
    const unsub = window.api.onScreenshotData((dataUrl) => {
      setScreenshotDataUrl(dataUrl)
    })
    return unsub
  }, [])

  const handleConfirmRegion = useCallback((r: Region) => {
    setRegion(r)
    setPhase('annotating')
  }, [])

  const handleCancel = useCallback(() => {
    window.api.cancelScreenshot()
  }, [])

  if (!screenshotDataUrl) {
    return <div className="fixed inset-0 bg-black/50" />
  }

  if (phase === 'selecting') {
    return (
      <RegionSelector
        screenshotDataUrl={screenshotDataUrl}
        onConfirm={handleConfirmRegion}
        onCancel={handleCancel}
      />
    )
  }

  // Annotation phase placeholder — will be replaced in Task 9
  return (
    <div className="fixed inset-0">
      <img src={screenshotDataUrl} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-black/45" />
      {region && (
        <div
          className="absolute border-2 border-[#5b9cf5]"
          style={{ left: region.x, top: region.y, width: region.width, height: region.height }}
        >
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap">
            标注功能即将实现... (Esc 取消)
          </div>
        </div>
      )}
    </div>
  )
}
