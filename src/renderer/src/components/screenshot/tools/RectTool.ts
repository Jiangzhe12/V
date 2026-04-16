import type { RectAnnotation } from '../../../types'

export function drawRect(ctx: CanvasRenderingContext2D, ann: RectAnnotation): void {
  ctx.strokeStyle = ann.color
  ctx.lineWidth = ann.strokeWidth
  ctx.strokeRect(
    Math.min(ann.start.x, ann.end.x),
    Math.min(ann.start.y, ann.end.y),
    Math.abs(ann.end.x - ann.start.x),
    Math.abs(ann.end.y - ann.start.y)
  )
}
