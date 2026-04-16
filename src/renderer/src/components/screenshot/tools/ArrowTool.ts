import type { ArrowAnnotation } from '../../../types'

export function drawArrow(ctx: CanvasRenderingContext2D, ann: ArrowAnnotation): void {
  const { start, end, color, strokeWidth } = ann
  const headLength = Math.max(10, strokeWidth * 4)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
