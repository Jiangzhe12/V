import type { TextAnnotation } from '../../../types'

export function drawText(ctx: CanvasRenderingContext2D, ann: TextAnnotation): void {
  ctx.fillStyle = ann.color
  ctx.font = `bold ${ann.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText(ann.text, ann.position.x, ann.position.y)
}
