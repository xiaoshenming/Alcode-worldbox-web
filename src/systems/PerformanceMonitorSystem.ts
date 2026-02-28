/**
 * PerformanceMonitorSystem — real-time performance overlay (F3 toggle).
 *
 * Displays FPS, entity count, memory usage, tick/speed info and a 120-frame
 * FPS history sparkline.  Renders to the top-right corner of the canvas with
 * a semi-transparent background.
 *
 * Design constraints:
 *  - Fixed-size ring buffer for FPS history (zero allocations in hot path).
 *  - No object creation inside update() / render().
 *  - Total file kept under 250 lines.
 */

// Ring buffer size for FPS history graph
const HISTORY_SIZE = 120

// Layout constants
const PANEL_W = 220
const PANEL_H = 140
const PANEL_MARGIN = 12
const PANEL_PAD = 10
const GRAPH_H = 40
const LINE_H = 16

// Warning thresholds
const WARN_FPS = 30
const CRIT_FPS = 15

// Colors
const BG_COLOR = 'rgba(0,0,0,0.65)'
const TEXT_COLOR = '#e0e0e0'
const GRAPH_COLOR = '#44ee66'
const WARN_COLOR = '#ffcc00'
const CRIT_COLOR = '#ff3333'
const GRAPH_LINE_COLOR = 'rgba(255,255,255,0.12)'

export class PerformanceMonitorSystem {
  // --- state ---
  private visible = false
  private fps = 0
  private entityCount = 0
  private memoryMB = 0
  private tick = 0
  private speed = 1

  // Ring buffer for FPS history
  private fpsHistory: Float32Array = new Float32Array(HISTORY_SIZE)
  private historyIndex = 0
  private historyFilled = false

  // FPS smoothing
  private frameTimeAccum = 0
  private frameCount = 0
  private fpsUpdateTimer = 0

  // Pre-computed display strings — updated only when underlying value changes
  private _fpsStr = 'FPS: 0'
  private _entStr = 'Entities: 0'
  private _memStr = 'Memory: N/A'
  private _tickStr = 'Tick: 0  Speed: 1x'
  private _lastFpsRounded = -1
  private _lastEntCount = -1
  private _lastMemRounded = -1
  private _lastTick = -1
  private _lastSpeed = -1

  // Keyboard listener reference (for potential cleanup)
  private boundKeyHandler: (e: KeyboardEvent) => void

  constructor() {
    // Pre-fill history with 0
    this.fpsHistory.fill(0)

    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        this.toggle()
      }
    }
    window.addEventListener('keydown', this.boundKeyHandler)
  }

  /** Toggle panel visibility. */
  toggle(): void {
    this.visible = !this.visible
  }

  /** Whether the panel is currently shown. */
  isVisible(): boolean {
    return this.visible
  }

  /**
   * Update performance data. Call once per frame.
   * @param dt  Delta time in seconds since last frame.
   */
  update(dt: number, entityCount: number, tick: number, speed: number): void {
    this.entityCount = entityCount
    this.tick = tick
    this.speed = speed

    // Accumulate for smoothed FPS (update ~2x per second)
    this.frameTimeAccum += dt
    this.frameCount++
    this.fpsUpdateTimer += dt

    if (this.fpsUpdateTimer >= 0.5) {
      this.fps = this.frameCount / this.frameTimeAccum
      this.frameTimeAccum = 0
      this.frameCount = 0
      this.fpsUpdateTimer = 0

      // Push to ring buffer
      this.fpsHistory[this.historyIndex] = this.fps
      this.historyIndex = (this.historyIndex + 1) % HISTORY_SIZE
      if (this.historyIndex === 0) this.historyFilled = true
    }

    // Memory (Chrome-only API)
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number }
    }
    if (perf.memory) {
      this.memoryMB = perf.memory.usedJSHeapSize / (1024 * 1024)
    }
  }

  /** Render the overlay onto the provided canvas context. */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return

    const cw = ctx.canvas.width
    const x = cw - PANEL_W - PANEL_MARGIN
    const y = PANEL_MARGIN

    // Save minimal state
    ctx.save()
    ctx.resetTransform()

    // Background
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(x, y, PANEL_W, PANEL_H)

    // Text setup
    ctx.font = '12px monospace'
    ctx.textBaseline = 'top'

    let ty = y + PANEL_PAD
    const tx = x + PANEL_PAD

    // FPS with warning color — use cached string, update only when value changes
    const fpsRounded = this.fps | 0
    if (fpsRounded !== this._lastFpsRounded) {
      this._lastFpsRounded = fpsRounded
      this._fpsStr = `FPS: ${fpsRounded}`
    }
    if (fpsRounded < CRIT_FPS) {
      ctx.fillStyle = CRIT_COLOR
    } else if (fpsRounded < WARN_FPS) {
      ctx.fillStyle = WARN_COLOR
    } else {
      ctx.fillStyle = GRAPH_COLOR
    }
    ctx.fillText(this._fpsStr, tx, ty)

    // Warning label
    if (fpsRounded < CRIT_FPS) {
      ctx.fillText(' [CRITICAL]', tx + 72, ty)
    } else if (fpsRounded < WARN_FPS) {
      ctx.fillText(' [WARNING]', tx + 72, ty)
    }

    ty += LINE_H
    ctx.fillStyle = TEXT_COLOR
    // Entity count — cache string, update only when count changes
    if (this.entityCount !== this._lastEntCount) {
      this._lastEntCount = this.entityCount
      this._entStr = `Entities: ${this.entityCount}`
    }
    ctx.fillText(this._entStr, tx, ty)

    ty += LINE_H
    if (this.memoryMB > 0) {
      // Memory rounds to 1 decimal — only rebuild when rounded value changes
      const memRounded = this.memoryMB * 10 | 0
      if (memRounded !== this._lastMemRounded) {
        this._lastMemRounded = memRounded
        this._memStr = `Memory: ${this.memoryMB.toFixed(1)} MB`
      }
      ctx.fillText(this._memStr, tx, ty)
    } else {
      ctx.fillText('Memory: N/A', tx, ty)
    }

    ty += LINE_H
    // Tick + speed — cache string, update when either changes
    if (this.tick !== this._lastTick || this.speed !== this._lastSpeed) {
      this._lastTick = this.tick
      this._lastSpeed = this.speed
      const speedLabel = this.speed === 0 ? 'PAUSED' : `${this.speed}x`
      this._tickStr = `Tick: ${this.tick}  Speed: ${speedLabel}`
    }
    ctx.fillText(this._tickStr, tx, ty)

    // --- FPS history sparkline ---
    ty += LINE_H + 4
    const graphX = tx
    const graphY = ty
    const graphW = PANEL_W - PANEL_PAD * 2

    // Graph background
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(graphX, graphY, graphW, GRAPH_H)

    // Reference lines at 30 and 60 FPS
    ctx.strokeStyle = GRAPH_LINE_COLOR
    ctx.lineWidth = 1
    const maxFps = 80 // scale ceiling
    for (const ref of [30, 60]) {
      const ry = graphY + GRAPH_H - (ref / maxFps) * GRAPH_H
      ctx.beginPath()
      ctx.moveTo(graphX, ry)
      ctx.lineTo(graphX + graphW, ry)
      ctx.stroke()
    }

    // Draw sparkline
    const count = this.historyFilled ? HISTORY_SIZE : this.historyIndex
    if (count > 1) {
      ctx.strokeStyle = GRAPH_COLOR
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < count; i++) {
        const idx = this.historyFilled
          ? (this.historyIndex + i) % HISTORY_SIZE
          : i
        const val = this.fpsHistory[idx]
        const px = graphX + (i / (HISTORY_SIZE - 1)) * graphW
        const clamped = val > maxFps ? maxFps : val < 0 ? 0 : val
        const py = graphY + GRAPH_H - (clamped / maxFps) * GRAPH_H
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }

    ctx.restore()
  }
}
