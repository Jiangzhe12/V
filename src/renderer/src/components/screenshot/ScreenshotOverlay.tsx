import React, { useState, useEffect, useCallback } from 'react'
import RegionSelector, { type Region } from './RegionSelector'
import AnnotationCanvas from './AnnotationCanvas'

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

  if (phase === 'annotating' && region) {
    return (
      <AnnotationCanvas
        screenshotDataUrl={screenshotDataUrl}
        region={region}
        onDone={(action, imageDataUrl) => {
          window.api.screenshotDone(action, imageDataUrl)
        }}
        onCancel={() => {
          window.api.cancelScreenshot()
        }}
      />
    )
  }

  return null
}
