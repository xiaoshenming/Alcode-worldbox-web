/**
 * SeasonVisualSystem - Visual overlay and particle effects for seasons
 */

import { Season } from './SeasonSystem'

/** Base particle data, pre-allocated and reused via active flag */
interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
  /** Packed color channels */
  r: number
  g: number
  b: number
  /** Cached color string (computed once on spawn) */
  color: string
  /** Per-type aux value (sway phase for leaves, flicker phase for fireflies, etc.) */
  phase: number
}

/** Season overlay tint definitions */
const SEASON_TINTS: Record<Season, { r: number; g: number; b: number; a: number }> = {
  [Season.Spring]: { r: 100, g: 200, b: 100, a: 0.03 },
  [Season.Summer]: { r: 200, g: 180, b: 80, a: 0.03 },
  [Season.Autumn]: { r: 200, g: 120, b: 50, a: 0.04 },
  [Season.Winter]: { r: 150, g: 180, b: 220, a: 0.05 },
}

/** Season indicator labels */
const SEASON_LABELS: Record<Season, { icon: string; name: string }> = {
  [Season.Spring]: { icon: '\uD83C\uDF38', name: '\u6625' },
  [Season.Summer]: { icon: '\u2600', name: '\u590F' },
  [Season.Autumn]: { icon: '\uD83C\uDF42', name: '\u79CB' },
  [Season.Winter]: { icon: '\u2744', name: '\u51AC' },
}
// Pre-computed display strings — avoids per-frame template literal allocation in renderSeasonIndicator
const SEASON_DISPLAY: Record<Season, string> = {
  [Season.Spring]: `${SEASON_LABELS[Season.Spring].icon} ${SEASON_LABELS[Season.Spring].name}`,
  [Season.Summer]: `${SEASON_LABELS[Season.Summer].icon} ${SEASON_LABELS[Season.Summer].name}`,
  [Season.Autumn]: `${SEASON_LABELS[Season.Autumn].icon} ${SEASON_LABELS[Season.Autumn].name}`,
  [Season.Winter]: `${SEASON_LABELS[Season.Winter].icon} ${SEASON_LABELS[Season.Winter].name}`,
}

const LEAF_COLORS = [
  { r: 210, g: 120, b: 40 },   // orange
  { r: 190, g: 60, b: 40 },    // red
  { r: 220, g: 190, b: 50 },   // yellow
  { r: 140, g: 90, b: 50 },    // brown
]

const PETAL_COLORS = [
  { r: 255, g: 180, b: 200 },  // pink
  { r: 255, g: 245, b: 250 },  // white
  { r: 200, g: 170, b: 230 },  // light purple
]

const MAX_LEAVES = 80
const MAX_SNOWFLAKES = 120
const MAX_PETALS = 40
const MAX_FIREFLIES = 30
const TOTAL_PARTICLES = MAX_LEAVES + MAX_SNOWFLAKES + MAX_PETALS + MAX_FIREFLIES

/** Slice offsets into the shared particle pool */
const OFF_LEAF = 0
const OFF_SNOW = MAX_LEAVES
const OFF_PETAL = MAX_LEAVES + MAX_SNOWFLAKES
const OFF_FIRE = MAX_LEAVES + MAX_SNOWFLAKES + MAX_PETALS

export class SeasonVisualSystem {
  private particles: Particle[]
  private indicatorAlpha: number = 1
  private prevSeason: Season = Season.Spring
  private indicatorFadeTimer: number = 0

  /** Cached rgba/rgb strings to avoid template-literal GC in render loops */
  private _cachedOverlayStyle = ''
  private _cachedOverlaySeason: Season = Season.Spring
  private _cachedOverlayAlpha = -1
  private _cachedSnowRgb = 'rgb(240,245,255)'

  constructor() {
    // Pre-allocate all particles once
    this.particles = new Array<Particle>(TOTAL_PARTICLES)
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      this.particles[i] = {
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        size: 1, alpha: 0, life: 0, maxLife: 300,
        r: 255, g: 255, b: 255, color: 'rgb(255,255,255)', phase: 0,
      }
    }
  }

  update(
    tick: number,
    season: Season,
    transitionProgress: number,
    isNight: boolean,
  ): void {
    // Detect season change for indicator fade
    if (season !== this.prevSeason) {
      this.prevSeason = season
      this.indicatorFadeTimer = 90 // ~1.5s highlight
      this.indicatorAlpha = 0
    }
    if (this.indicatorFadeTimer > 0) {
      this.indicatorFadeTimer--
      this.indicatorAlpha = Math.min(1, this.indicatorAlpha + 0.05)
    } else {
      this.indicatorAlpha = Math.min(1, this.indicatorAlpha + 0.02)
    }

    // Spawn + update each particle type
    this.updateLeaves(tick, season)
    this.updateSnowflakes(tick, season)
    this.updatePetals(tick, season)
    this.updateFireflies(tick, season, isNight)
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    season: Season,
    transitionProgress: number,
    isNight: boolean,
  ): void {
    // 1. Season color overlay (cache rgba string to avoid per-frame alloc)
    const tint = SEASON_TINTS[season]
    const alpha = tint.a * (transitionProgress < 1 ? transitionProgress : 1)
    if (alpha > 0) {
      if (season !== this._cachedOverlaySeason || alpha !== this._cachedOverlayAlpha) {
        this._cachedOverlaySeason = season
        this._cachedOverlayAlpha = alpha
        this._cachedOverlayStyle = `rgba(${tint.r},${tint.g},${tint.b},${alpha})`
      }
      ctx.fillStyle = this._cachedOverlayStyle
      ctx.fillRect(0, 0, width, height)
    }

    // 2. Draw particles
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      ctx.globalAlpha = p.alpha
      if (i >= OFF_FIRE) {
        // Firefly: glow circle
        this.drawFirefly(ctx, p)
      } else if (i >= OFF_PETAL) {
        // Petal: small ellipse
        this.drawPetal(ctx, p)
      } else if (i >= OFF_SNOW) {
        // Snowflake: circle (all share same color, use cached string)
        ctx.fillStyle = this._cachedSnowRgb
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, 6.2832)
        ctx.fill()
      } else {
        // Leaf: small rotated rect
        this.drawLeaf(ctx, p)
      }
    }
    ctx.globalAlpha = 1
  }

  renderSeasonIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    season: Season,
    seasonProgress: number,
  ): void {
    const label = SEASON_LABELS[season]
    ctx.save()
    ctx.globalAlpha = this.indicatorAlpha

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const pillW = 72
    const pillH = 28
    const radius = 6
    this.roundRect(ctx, x, y, pillW, pillH, radius)
    ctx.fill()

    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    this.roundRect(ctx, x + 2, y + pillH - 5, (pillW - 4) * seasonProgress, 3, 1.5)
    ctx.fill()

    // Icon + text
    ctx.font = '14px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(SEASON_DISPLAY[season], x + 10, y + pillH / 2)

    ctx.restore()
  }

  private updateLeaves(tick: number, season: Season): void {
    const shouldSpawn = season === Season.Autumn
    for (let i = OFF_LEAF; i < OFF_SNOW; i++) {
      const p = this.particles[i]
      if (p.active) {
        p.life++
        p.x += p.vx + Math.sin(p.phase + p.life * 0.03) * 0.4
        p.y += p.vy
        p.phase += 0.01
        // Fade out near end of life or when not autumn
        if (!shouldSpawn && p.life > p.maxLife * 0.5) {
          p.alpha = Math.max(0, p.alpha - 0.008)
        } else {
          p.alpha = Math.min(0.85, 1 - p.life / p.maxLife)
        }
        if (p.life >= p.maxLife || p.alpha <= 0) {
          p.active = false
        }
      } else if (shouldSpawn && tick % 4 === 0 && Math.random() < 0.3) {
        this.spawnLeaf(p)
      }
    }
  }

  private updateSnowflakes(tick: number, season: Season): void {
    const shouldSpawn = season === Season.Winter
    for (let i = OFF_SNOW; i < OFF_PETAL; i++) {
      const p = this.particles[i]
      if (p.active) {
        p.life++
        p.x += p.vx + Math.sin(p.phase + p.life * 0.02) * 0.25
        p.y += p.vy
        if (!shouldSpawn && p.life > p.maxLife * 0.5) {
          p.alpha = Math.max(0, p.alpha - 0.006)
        } else {
          p.alpha = Math.min(0.9, 1 - (p.life / p.maxLife) * 0.5)
        }
        if (p.life >= p.maxLife || p.alpha <= 0) {
          p.active = false
        }
      } else if (shouldSpawn && tick % 3 === 0 && Math.random() < 0.35) {
        this.spawnSnowflake(p)
      }
    }
  }

  private updatePetals(tick: number, season: Season): void {
    const shouldSpawn = season === Season.Spring
    for (let i = OFF_PETAL; i < OFF_FIRE; i++) {
      const p = this.particles[i]
      if (p.active) {
        p.life++
        p.x += p.vx + Math.sin(p.phase + p.life * 0.04) * 0.3
        p.y += p.vy
        const lifeRatio = p.life / p.maxLife
        if (lifeRatio < 0.2) {
          p.alpha = lifeRatio * 4 // fade in
        } else {
          p.alpha = Math.max(0, 0.8 * (1 - (lifeRatio - 0.2) / 0.8))
        }
        if (!shouldSpawn) {
          p.alpha = Math.max(0, p.alpha - 0.01)
        }
        if (p.life >= p.maxLife || p.alpha <= 0) {
          p.active = false
        }
      } else if (shouldSpawn && tick % 6 === 0 && Math.random() < 0.2) {
        this.spawnPetal(p)
      }
    }
  }

  private updateFireflies(tick: number, season: Season, isNight: boolean): void {
    const shouldSpawn = season === Season.Summer && isNight
    for (let i = OFF_FIRE; i < TOTAL_PARTICLES; i++) {
      const p = this.particles[i]
      if (p.active) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        // Random drift change
        if (tick % 30 === 0) {
          p.vx = (Math.random() - 0.5) * 0.6
          p.vy = (Math.random() - 0.5) * 0.4
        }
        // Flicker
        p.phase += 0.08
        const flicker = 0.4 + 0.6 * Math.abs(Math.sin(p.phase))
        const lifeRatio = p.life / p.maxLife
        p.alpha = flicker * Math.min(1, 1 - lifeRatio * 0.5)
        if (!shouldSpawn) {
          p.alpha = Math.max(0, p.alpha - 0.015)
        }
        if (p.life >= p.maxLife || p.alpha <= 0) {
          p.active = false
        }
      } else if (shouldSpawn && tick % 10 === 0 && Math.random() < 0.15) {
        this.spawnFirefly(p)
      }
    }
  }

  private spawnLeaf(p: Particle): void {
    const c = LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0]
    p.active = true
    p.x = Math.random() * 1200 // will be clipped to canvas
    p.y = -10
    p.vx = (Math.random() - 0.5) * 0.5
    p.vy = 0.5 + Math.random() * 0.8
    p.size = 3 + Math.random() * 3
    p.alpha = 0.8
    p.life = 0
    p.maxLife = 300 + (Math.random() * 200) | 0
    p.r = c.r; p.g = c.g; p.b = c.b
    p.color = `rgb(${c.r},${c.g},${c.b})`
    p.phase = Math.random() * 6.28
  }

  private spawnSnowflake(p: Particle): void {
    p.active = true
    p.x = Math.random() * 1200
    p.y = -5
    p.vx = (Math.random() - 0.5) * 0.3
    p.vy = 0.3 + Math.random() * 0.4
    p.size = 1 + Math.random() * 2
    p.alpha = 0.85
    p.life = 0
    p.maxLife = 400 + (Math.random() * 200) | 0
    p.r = 240; p.g = 245; p.b = 255
    p.color = 'rgb(240,245,255)'
    p.phase = Math.random() * 6.28
  }

  private spawnPetal(p: Particle): void {
    const c = PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0]
    p.active = true
    p.x = Math.random() * 1200
    p.y = 600 + Math.random() * 50 // start from bottom
    p.vx = (Math.random() - 0.5) * 0.3
    p.vy = -(0.3 + Math.random() * 0.5) // rise upward
    p.size = 2 + Math.random() * 2
    p.alpha = 0
    p.life = 0
    p.maxLife = 250 + (Math.random() * 150) | 0
    p.r = c.r; p.g = c.g; p.b = c.b
    p.color = `rgb(${c.r},${c.g},${c.b})`
    p.phase = Math.random() * 6.28
  }

  private spawnFirefly(p: Particle): void {
    p.active = true
    p.x = Math.random() * 1200
    p.y = 100 + Math.random() * 400
    p.vx = (Math.random() - 0.5) * 0.4
    p.vy = (Math.random() - 0.5) * 0.3
    p.size = 2 + Math.random()
    p.alpha = 0.6
    p.life = 0
    p.maxLife = 350 + (Math.random() * 250) | 0
    p.r = 180; p.g = 220; p.b = 80
    p.color = 'rgb(180,220,80)'
    p.phase = Math.random() * 6.28
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.phase + p.life * 0.02)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
    ctx.restore()
  }

  private drawPetal(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.phase)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, 6.2832)
    ctx.fill()
    ctx.restore()
  }

  private drawFirefly(ctx: CanvasRenderingContext2D, p: Particle): void {
    // Glow
    ctx.globalAlpha = p.alpha * 0.3
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 3, 0, 6.2832)
    ctx.fill()
    // Core
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, 6.2832)
    ctx.fill()
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
