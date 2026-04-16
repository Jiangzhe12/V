import type { PenAnnotation } from '../../../types'

export function drawPen(ctx: CanvasRenderingContext2D, ann: PenAnnotation): void {
  if (ann.points.length < 2) return

  ctx.strokeStyle = ann.color
  ctx.lineWidth = ann.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(ann.points[0].x, ann.points[0].y)
  for (let i = 1; i < ann.points.length; i++) {
    ctx.lineTo(ann.points[i].x, ann.points[i].y)
  }
  ctx.stroke()
}
