/**
 * ScreenshotModeSystem - hide UI, capture canvas as PNG, auto-download.
 * Supports 1x/2x/4x resolution multipliers.
 */

const UI_SELECTORS = [
  '#ui', '#minimap', '#minimapModeBtn', '#eventPanel',
  '#tooltip', '#contextMenu', '#versionBadge', '#creaturePanel',
  '#statsPanel', '#achievementsPanel', '#timelinePanel', '#techTreePanel',
  '#helpOverlay', '#statsToggle',
] as const

const TOAST_MS = 1500

export class ScreenshotModeSystem {
  private active = false
  private multiplier = 1
  private toastTimer = 0
  private showToast = false
  private stashedDisplay: string[] = []

  constructor() { /* no-op */ }

  /** Enter screenshot mode: hide UI, request capture on next frame. */
  enterScreenshotMode(multiplier = 1): void {
    if (this.active) return
    this.multiplier = multiplier
    this.active = true
    this.hideUI()
  }

  isActive(): boolean { return this.active }

  /** Called each frame. Handles toast countdown. */
  update(): void {
    if (this.showToast) {
      this.toastTimer -= 16
      if (this.toastTimer <= 0) this.showToast = false
    }
  }

  /** Capture the canvas content and trigger a PNG download. */
  captureAndDownload(canvas: HTMLCanvasElement): void {
    const m = this.multiplier
    if (m === 1) {
      this.downloadFromCanvas(canvas)
    } else {
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width * m
      tmp.height = canvas.height * m
      const ctx = tmp.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
        this.downloadFromCanvas(tmp)
      } else {
        this.downloadFromCanvas(canvas)
      }
    }
    this.restoreUI()
    this.active = false
    this.showToast = true
    this.toastTimer = TOAST_MS
  }

  /** Render the "Screenshot saved!" toast. */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.showToast) return
    const alpha = Math.min(1, this.toastTimer / 300)
    ctx.save()
    ctx.globalAlpha = alpha * 0.85
    const text = 'Screenshot saved!'
    ctx.font = 'bold 14px monospace'
    const tw = ctx.measureText(text).width
    const px = (screenW - tw) / 2 - 14
    const py = screenH - 60
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.roundRect(px, py, tw + 28, 30, 6)
    ctx.fill()
    ctx.strokeStyle = '#4a6a9a'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#7ec8e3'
    ctx.fillText(text, px + 14, py + 20)
    ctx.restore()
  }

  private hideUI(): void {
    for (let i = 0; i < UI_SELECTORS.length; i++) {
      const el = document.querySelector<HTMLElement>(UI_SELECTORS[i])
      this.stashedDisplay[i] = el ? el.style.display : ''
      if (el) el.style.display = 'none'
    }
  }

  private restoreUI(): void {
    for (let i = 0; i < UI_SELECTORS.length; i++) {
      const el = document.querySelector<HTMLElement>(UI_SELECTORS[i])
      if (el) el.style.display = this.stashedDisplay[i] ?? ''
    }
  }

  private downloadFromCanvas(canvas: HTMLCanvasElement): void {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const name = `worldbox_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`
    const a = document.createElement('a')
    a.download = name
    a.href = canvas.toDataURL('image/png')
    a.click()
  }
}
