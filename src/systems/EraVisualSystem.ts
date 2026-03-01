// Era Visual System - changes global visual style based on the most advanced civilization's era

export type EraName = 'stone' | 'bronze' | 'iron' | 'medieval' | 'renaissance'

interface EraVisualStyle {
  name: EraName
  displayName: string
  // Color overlay
  overlayColor: string // rgba
  overlayAlpha: number
  // Color grading
  tintR: number // -0.2 to 0.2
  tintG: number
  tintB: number
  saturation: number // 0.8-1.2
  brightness: number // 0.9-1.1
  // UI theme
  uiBorderColor: string
  uiAccentColor: string
  uiBgAlpha: number
  // Icon
  icon: string // emoji or text symbol
}

const ERA_STYLES: Map<EraName, EraVisualStyle> = new Map([
  ['stone', {
    name: 'stone',
    displayName: 'Stone Age',
    overlayColor: 'rgba(34,139,34,0.05)',
    overlayAlpha: 0.05,
    tintR: -0.05,
    tintG: 0.08,
    tintB: -0.04,
    saturation: 0.9,
    brightness: 0.95,
    uiBorderColor: '#8B7355',
    uiAccentColor: '#6B8E23',
    uiBgAlpha: 0.75,
    icon: '🪨',
  }],
  ['bronze', {
    name: 'bronze',
    displayName: 'Bronze Age',
    overlayColor: 'rgba(205,127,50,0.06)',
    overlayAlpha: 0.06,
    tintR: 0.1,
    tintG: 0.05,
    tintB: -0.06,
    saturation: 1.05,
    brightness: 1.0,
    uiBorderColor: '#CD7F32',
    uiAccentColor: '#DAA520',
    uiBgAlpha: 0.78,
    icon: '⚔️',
  }],
  ['iron', {
    name: 'iron',
    displayName: 'Iron Age',
    overlayColor: 'rgba(113,121,126,0.06)',
    overlayAlpha: 0.06,
    tintR: -0.04,
    tintG: -0.02,
    tintB: 0.02,
    saturation: 0.85,
    brightness: 0.95,
    uiBorderColor: '#71797E',
    uiAccentColor: '#A9A9A9',
    uiBgAlpha: 0.8,
    icon: '🛡️',
  }],
  ['medieval', {
    name: 'medieval',
    displayName: 'Medieval Age',
    overlayColor: 'rgba(74,74,106,0.07)',
    overlayAlpha: 0.07,
    tintR: -0.03,
    tintG: -0.04,
    tintB: 0.1,
    saturation: 0.92,
    brightness: 0.92,
    uiBorderColor: '#4A4A6A',
    uiAccentColor: '#7B68EE',
    uiBgAlpha: 0.82,
    icon: '🏰',
  }],
  ['renaissance', {
    name: 'renaissance',
    displayName: 'Renaissance',
    overlayColor: 'rgba(255,215,0,0.04)',
    overlayAlpha: 0.04,
    tintR: 0.08,
    tintG: 0.04,
    tintB: -0.02,
    saturation: 1.15,
    brightness: 1.08,
    uiBorderColor: '#DAA520',
    uiAccentColor: '#FF8C00',
    uiBgAlpha: 0.72,
    icon: '🎨',
  }],
])

export class EraVisualSystem {
  private currentEra: EraName = 'stone'
  private targetEra: EraName = 'stone'
  private transitionProgress: number = 1.0 // 0=transitioning, 1=complete
  private transitionSpeed: number = 0.008 // ~120 frames to complete
  private styles: Map<EraName, EraVisualStyle> = ERA_STYLES

  // Flash effect state
  private flashAlpha: number = 0
  private flashDecay: number = 0.02

  // Era indicator display timer (show for 300 frames after change)
  private indicatorTimer: number = 0
  private readonly INDICATOR_DURATION = 300

  // Cached overlay fill style string — rebuilt only when style changes
  private _overlayFillStyle = ''
  private _overlayTintR = NaN
  private _overlayTintG = NaN
  private _overlayTintB = NaN
  private _overlayAlpha = NaN
  /** Cached indicator pill width — rebuilt when era changes */
  private _indicatorPillW = 0
  private _prevIndicatorEra: EraName = '' as EraName

  constructor() {}

  /** Set the current era (called by EraSystem). Starts transition if different. */
  setEra(era: EraName): void {
    if (era === this.targetEra) return
    this.targetEra = era
    this.transitionProgress = 0
    this.flashAlpha = 1.0
    this.indicatorTimer = this.INDICATOR_DURATION
  }

  getCurrentEra(): EraName {
    return this.currentEra
  }

  /** Update transition animation each frame. */
  update(): void {
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + this.transitionSpeed)
      if (this.transitionProgress >= 1.0) {
        this.currentEra = this.targetEra
      }
    }

    // Decay flash
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay)
    }

    // Tick indicator timer
    if (this.indicatorTimer > 0) {
      this.indicatorTimer--
    }
  }

  /** Render the era color overlay on top of the world. */
  renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const style = this.getCurrentStyle()

    // Apply color overlay
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    // Compute overlay RGB from tint values — cache to avoid per-frame string allocation
    const r = Math.round(128 + style.tintR * 255)
    const g = Math.round(128 + style.tintG * 255)
    const b = Math.round(128 + style.tintB * 255)
    if (r !== this._overlayTintR || g !== this._overlayTintG || b !== this._overlayTintB || style.overlayAlpha !== this._overlayAlpha) {
      this._overlayTintR = r; this._overlayTintG = g; this._overlayTintB = b; this._overlayAlpha = style.overlayAlpha
      this._overlayFillStyle = `rgba(${r},${g},${b},${style.overlayAlpha})`
    }
    ctx.fillStyle = this._overlayFillStyle
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // Brightness pass
    if (style.brightness !== 1.0) {
      ctx.save()
      if (style.brightness > 1.0) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = (style.brightness - 1.0) * 0.5
        ctx.fillStyle = '#ffffff'
      } else {
        ctx.globalCompositeOperation = 'multiply'
        ctx.globalAlpha = (1.0 - style.brightness) * 0.3
        ctx.fillStyle = '#000000'
      }
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    // Transition flash
    this.renderTransitionFlash(ctx, width, height)
  }

  /** Render era indicator in the top-left corner. */
  renderEraIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.indicatorTimer <= 0) return

    const style = this.styles.get(this.targetEra)
    if (!style) return
    // Fade out in the last 60 frames
    const fadeFrames = 60
    let alpha = 1.0
    if (this.indicatorTimer < fadeFrames) {
      alpha = this.indicatorTimer / fadeFrames
    }

    ctx.save()
    ctx.globalAlpha = alpha

    // Background pill
    const text = `${style.icon} ${style.displayName}`
    ctx.font = 'bold 14px monospace'
    if (this.currentEra !== this._prevIndicatorEra) {
      this._prevIndicatorEra = this.currentEra
      this._indicatorPillW = ctx.measureText(style.displayName).width + 40
    }
    const pillW = this._indicatorPillW
    const pillH = 28
    const px = x + 10
    const py = y + 10

    ctx.save()
    ctx.globalAlpha = style.uiBgAlpha
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(px, py, pillW, pillH, 6)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()

    // Border
    ctx.strokeStyle = style.uiBorderColor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(px, py, pillW, pillH, 6)
    ctx.stroke()

    // Icon + text
    ctx.fillStyle = style.uiAccentColor
    ctx.textBaseline = 'middle'
    ctx.fillText(text, px + 8, py + pillH / 2)

    ctx.restore()
  }

  /** Render the white flash during era transitions. */
  private renderTransitionFlash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.flashAlpha <= 0) return

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = this.flashAlpha * 0.6
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  /** Interpolate between current and target era styles during transition. */
  private getCurrentStyle(): EraVisualStyle {
    const from = this.styles.get(this.currentEra)
    const to = this.styles.get(this.targetEra)

    if (!from || !to) return (to ?? from ?? this.styles.get('stone'))!

    if (this.transitionProgress >= 1.0) return to
    if (this.transitionProgress <= 0) return from

    const t = this.transitionProgress
    return {
      name: to.name,
      displayName: to.displayName,
      overlayColor: to.overlayColor,
      overlayAlpha: this.lerp(from.overlayAlpha, to.overlayAlpha, t),
      tintR: this.lerp(from.tintR, to.tintR, t),
      tintG: this.lerp(from.tintG, to.tintG, t),
      tintB: this.lerp(from.tintB, to.tintB, t),
      saturation: this.lerp(from.saturation, to.saturation, t),
      brightness: this.lerp(from.brightness, to.brightness, t),
      uiBorderColor: this.lerpColor(from.uiBorderColor, to.uiBorderColor, t),
      uiAccentColor: this.lerpColor(from.uiAccentColor, to.uiAccentColor, t),
      uiBgAlpha: this.lerp(from.uiBgAlpha, to.uiBgAlpha, t),
      icon: to.icon,
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private lerpColor(hexA: string, hexB: string, t: number): string {
    const a = this.hexToRgb(hexA)
    const b = this.hexToRgb(hexB)
    const r = Math.round(this.lerp(a.r, b.r, t))
    const g = Math.round(this.lerp(a.g, b.g, t))
    const bl = Math.round(this.lerp(a.b, b.b, t))
    return `rgb(${r},${g},${bl})`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  }
}
