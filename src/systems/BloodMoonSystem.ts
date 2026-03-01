/**
 * BloodMoonSystem — Periodic blood moon events with dramatic visual and gameplay effects.
 * Blood moons occur randomly every 3000-6000 ticks and last 300 ticks.
 * During a blood moon, hostile creatures gain combat bonuses, undead spawn rates triple,
 * and the world is bathed in an eerie red glow with blood rain particles.
 */

/** Blood moon phase */
type BloodMoonPhase = 'none' | 'rising' | 'peak' | 'waning'

/** RGBA color overlay */
interface OverlayColor {
  r: number
  g: number
  b: number
  a: number
}

/** Particle position for blood rain */
interface ParticlePosition {
  x: number
  y: number
}

// Phase durations in ticks
const RISING_TICKS = 60
const PEAK_TICKS = 180
const WANING_TICKS = 60
const TOTAL_DURATION = RISING_TICKS + PEAK_TICKS + WANING_TICKS // 300

// Cooldown range between blood moons
const MIN_COOLDOWN = 3000
const MAX_COOLDOWN = 6000

// Combat modifiers
const ATTACK_BONUS = 1.5   // +50% attack
const SPEED_BONUS = 1.3    // +30% speed
const SPAWN_RATE_MULTIPLIER = 3.0

// Blood rain config
const RAIN_DENSITY = 12  // particles per call
const MOON_BASE_RADIUS = 40

// Pre-computed overlay colors: 101 steps for intensity 0.00..1.00
// overlay.a = 0.18 * intensity => 0.00..0.18
const _BLOOD_OVERLAY_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const a = (0.18 * i / 100).toFixed(3)
    cols.push(`rgba(180,20,20,${a})`)
  }
  return cols
})()

// Pre-computed streak colors: 101 steps for intensity 0.00..1.00
// streak alpha = 0.15 + 0.15 * intensity => 0.15..0.30
const _BLOOD_STREAK_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const a = (0.15 + 0.15 * i / 100).toFixed(3)
    cols.push(`rgba(160,20,20,${a})`)
  }
  return cols
})()

// Pre-computed glow gradient colors: 101 steps for intensity 0.00..1.00
const _BLOOD_GLOW_COLORS0: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(200,30,30,${(0.25 * i / 100).toFixed(3)})`)
  return cols
})()
const _BLOOD_GLOW_COLORS1: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(150,10,10,${(0.10 * i / 100).toFixed(3)})`)
  return cols
})()

// Pre-computed moon gradient colors: 101 steps for intensity 0.00..1.00
const _BLOOD_MOON_COLORS0: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(220,50,40,${(0.9 * i / 100).toFixed(3)})`)
  return cols
})()
const _BLOOD_MOON_COLORS1: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(180,20,20,${(0.7 * i / 100).toFixed(3)})`)
  return cols
})()
const _BLOOD_MOON_COLORS2: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(120,10,10,${(0.3 * i / 100).toFixed(3)})`)
  return cols
})()

export class BloodMoonSystem {
  private cooldown: number = MIN_COOLDOWN + Math.floor(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN))
  private elapsed: number = 0
  private active: boolean = false
  private ticksSinceLastMoon: number = 0

  // Seeded pseudo-random state for deterministic rain positions
  private rainSeed: number = 0

  /**
   * Advance the blood moon state machine by one tick.
   * Call this once per game tick.
   * @param tick - Current world tick (used for animation timing)
   */
  update(tick: number): void {
    if (this.active) {
      this.elapsed++
      if (this.elapsed >= TOTAL_DURATION) {
        this.active = false
        this.elapsed = 0
        this.cooldown = MIN_COOLDOWN + Math.floor(Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN))
        this.ticksSinceLastMoon = 0
      }
    } else {
      this.ticksSinceLastMoon++
      if (this.ticksSinceLastMoon >= this.cooldown) {
        this.active = true
        this.elapsed = 0
        this.rainSeed = tick
      }
    }
  }

  /** Whether a blood moon event is currently active. */
  isActive(): boolean {
    return this.active
  }

  /** Current phase of the blood moon. */
  getPhase(): BloodMoonPhase {
    if (!this.active) return 'none'
    if (this.elapsed < RISING_TICKS) return 'rising'
    if (this.elapsed < RISING_TICKS + PEAK_TICKS) return 'peak'
    return 'waning'
  }

  /**
   * Visual intensity of the blood moon effect, 0 to 1.
   * Ramps up during rising, holds at 1 during peak, ramps down during waning.
   */
  getIntensity(): number {
    if (!this.active) return 0
    const phase = this.getPhase()
    if (phase === 'rising') return this.elapsed / RISING_TICKS
    if (phase === 'peak') return 1
    // waning
    const waningElapsed = this.elapsed - RISING_TICKS - PEAK_TICKS
    return 1 - waningElapsed / WANING_TICKS
  }

  /**
   * Red tint overlay color. Intensity scales the alpha channel.
   * Returns { r, g, b, a } suitable for canvas fillStyle.
   */
  getOverlayColor(): OverlayColor {
    const intensity = this.getIntensity()
    if (intensity <= 0) return { r: 0, g: 0, b: 0, a: 0 }
    return {
      r: 180,
      g: 20,
      b: 20,
      a: 0.18 * intensity,
    }
  }

  /**
   * Combat multiplier for hostile creatures during blood moon.
   * Combines attack (+50%) and speed (+30%) into a single power multiplier.
   * Returns 1.0 when inactive.
   */
  getCombatModifier(): number {
    if (!this.active) return 1.0
    const intensity = this.getIntensity()
    // Blend from 1.0 toward full bonus based on intensity
    return 1.0 + (ATTACK_BONUS - 1.0) * intensity
  }

  /**
   * Spawn rate multiplier for undead/monster creatures.
   * Returns 1.0 when inactive, up to 3.0 at peak.
   */
  getSpawnRateModifier(): number {
    if (!this.active) return 1.0
    const intensity = this.getIntensity()
    return 1.0 + (SPAWN_RATE_MULTIPLIER - 1.0) * intensity
  }

  /**
   * Speed multiplier for hostile creatures during blood moon.
   * Returns 1.0 when inactive, up to 1.3 at peak.
   */
  getSpeedModifier(): number {
    if (!this.active) return 1.0
    return 1.0 + (SPEED_BONUS - 1.0) * this.getIntensity()
  }

  /**
   * Generate blood rain particle positions within the given viewport.
   * Returns an array of {x, y} screen-space positions for particle spawning.
   * @param viewportX - Left edge of viewport in world coords
   * @param viewportY - Top edge of viewport in world coords
   * @param viewportW - Viewport width in world coords
   * @param viewportH - Viewport height in world coords
   */
  getBloodRainPositions(
    viewportX: number,
    viewportY: number,
    viewportW: number,
    viewportH: number
  ): ParticlePosition[] {
    if (!this.active) return []
    const intensity = this.getIntensity()
    const count = Math.floor(RAIN_DENSITY * intensity)
    const positions: ParticlePosition[] = []

    // Use a simple LCG seeded by rainSeed + elapsed for deterministic but varied positions
    let seed = (this.rainSeed + this.elapsed * 7919) | 0
    for (let i = 0; i < count; i++) {
      seed = (seed * 1664525 + 1013904223) | 0
      const rx = ((seed >>> 0) / 0xFFFFFFFF)
      seed = (seed * 1664525 + 1013904223) | 0
      const ry = ((seed >>> 0) / 0xFFFFFFFF)
      positions.push({
        x: viewportX + rx * viewportW,
        y: viewportY + ry * viewportH,
      })
    }
    return positions
  }

  /**
   * Render the blood moon visual effects: red overlay, moon disc, and blood rain streaks.
   * Call after the main world render pass.
   * @param ctx - Canvas 2D rendering context
   * @param canvasWidth - Canvas width in pixels
   * @param canvasHeight - Canvas height in pixels
   * @param tick - Current world tick for animation
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    tick: number
  ): void {
    if (!this.active) return
    const intensity = this.getIntensity()
    if (intensity <= 0) return

    const prevComposite = ctx.globalCompositeOperation

    // --- Red overlay ---
    const intensityIdx = Math.round(intensity * 100)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = _BLOOD_OVERLAY_COLORS[intensityIdx]
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // --- Moon disc in upper-right sky area ---
    const moonX = canvasWidth * 0.82
    const moonY = canvasHeight * 0.12
    const moonRadius = MOON_BASE_RADIUS * (0.8 + 0.2 * intensity)
    const pulse = 1 + 0.05 * Math.sin(tick * 0.08)
    const finalRadius = moonRadius * pulse

    // Outer glow — 4 concentric circles instead of createRadialGradient (zero GC allocation)
    ctx.globalCompositeOperation = 'lighter'
    const glow0 = _BLOOD_GLOW_COLORS0[intensityIdx]
    const glow1 = _BLOOD_GLOW_COLORS1[intensityIdx]
    ctx.globalAlpha = 1
    ctx.fillStyle = glow0
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 0.9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = glow1
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 1.5, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 2.0, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.25
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 2.5, 0, Math.PI * 2); ctx.fill()

    // Moon body — 3 concentric circles instead of createRadialGradient
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = _BLOOD_MOON_COLORS2[intensityIdx]
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = _BLOOD_MOON_COLORS1[intensityIdx]
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 0.7, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = _BLOOD_MOON_COLORS0[intensityIdx]
    ctx.beginPath(); ctx.arc(moonX, moonY, finalRadius * 0.35, 0, Math.PI * 2); ctx.fill()

    // --- Blood rain streaks ---
    ctx.globalCompositeOperation = 'source-over'
    const streakCount = Math.floor(8 * intensity)
    let seed = (tick * 3571 + this.elapsed * 131) | 0
    ctx.strokeStyle = _BLOOD_STREAK_COLORS[intensityIdx]
    ctx.lineWidth = 1
    for (let i = 0; i < streakCount; i++) {
      seed = (seed * 1664525 + 1013904223) | 0
      const sx = ((seed >>> 0) / 0xFFFFFFFF) * canvasWidth
      seed = (seed * 1664525 + 1013904223) | 0
      const sy = ((seed >>> 0) / 0xFFFFFFFF) * canvasHeight
      const streakLen = 6 + ((seed >>> 16) & 0xF)

      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx - 1, sy + streakLen)
      ctx.stroke()
    }

    ctx.globalCompositeOperation = prevComposite
  }
}
