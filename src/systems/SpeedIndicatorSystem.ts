/** SpeedIndicatorSystem — HUD speed indicator with animated time-flow visualization. */

const INDICATOR_W = 120
const INDICATOR_H = 32
const MARGIN = 12

/** Pre-allocated arrays for animation dots to avoid GC. */
const DOT_COUNT = 8
const dotX = new Float32Array(DOT_COUNT)
const dotAlpha = new Float32Array(DOT_COUNT)

const SPEED_LABELS: Record<number, string> = {
  0: '⏸ Paused',
  1: '▶ 1x',
  2: '▶▶ 2x',
  5: '▶▶▶ 5x',
}

const SPEED_COLORS: Record<number, string> = {
  0: '#888',
  1: '#4fc3f7',
  2: '#66bb6a',
  5: '#ff7043',
}

export class SpeedIndicatorSystem {
  private animPhase = 0

  /** Update animation phase. Call once per frame. */
  update(speed: number): void {
    if (speed === 0) return
    this.animPhase += speed * 0.03
    if (this.animPhase > 1) this.animPhase -= 1
  }

  /** Render the speed indicator HUD at bottom-center of screen. */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number, speed: number): void {
    const x = (screenW - INDICATOR_W) / 2
    const y = screenH - INDICATOR_H - MARGIN

    ctx.save()

    // Background
    ctx.fillStyle = 'rgba(12,14,22,0.8)'
    ctx.strokeStyle = SPEED_COLORS[speed] ?? '#aaa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, INDICATOR_W, INDICATOR_H, 6)
    ctx.fill()
    ctx.stroke()

    // Speed label
    ctx.fillStyle = SPEED_COLORS[speed] ?? '#aaa'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(SPEED_LABELS[speed] ?? `▶ ${speed}x`, x + INDICATOR_W / 2, y + INDICATOR_H / 2)

    // Animated flow dots (only when not paused)
    if (speed > 0) {
      const dotY = y + INDICATOR_H - 5
      const startX = x + 10
      const endX = x + INDICATOR_W - 10
      const range = endX - startX
      const color = SPEED_COLORS[speed] ?? '#aaa'

      for (let i = 0; i < DOT_COUNT; i++) {
        const phase = (this.animPhase + i / DOT_COUNT) % 1
        dotX[i] = startX + phase * range
        dotAlpha[i] = Math.sin(phase * Math.PI) * 0.6
      }

      for (let i = 0; i < DOT_COUNT; i++) {
        ctx.globalAlpha = dotAlpha[i]
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(dotX[i], dotY, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}
