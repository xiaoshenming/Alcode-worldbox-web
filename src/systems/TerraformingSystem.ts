import { TileType, TILE_COLORS, TILE_SIZE } from '../utils/Constants'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'

export type TerraformEffectType = 'grow' | 'erode' | 'freeze' | 'burn' | 'flood'

export interface TerraformEffect {
  x: number
  y: number
  fromTile: TileType
  toTile: TileType
  effectType: TerraformEffectType
  progress: number      // 0-1
  duration: number      // total ticks
  elapsed: number
  particleCooldown: number
  // Cached blended color — recomputed only when progress quantile changes
  _cachedColor: string
  _lastProgressQ: number  // Math.round(progress * 50) — 51 levels
}

// Per-effect-type visual config
interface EffectConfig {
  colors: string[]
  particleInterval: number  // ticks between particle spawns
  particleSpread: number
}

const EFFECT_CONFIGS: Record<TerraformEffectType, EffectConfig> = {
  grow:   { colors: ['#44cc44', '#66ee44', '#88ff66'], particleInterval: 6, particleSpread: 1.2 },
  erode:  { colors: ['#aa8855', '#886644', '#665533'], particleInterval: 5, particleSpread: 1.8 },
  freeze: { colors: ['#aaddff', '#cceeFF', '#ffffff'], particleInterval: 4, particleSpread: 1.0 },
  burn:   { colors: ['#ff4400', '#ff8800', '#ffcc00'], particleInterval: 3, particleSpread: 2.0 },
  flood:  { colors: ['#2266cc', '#4488ee', '#66aaff'], particleInterval: 5, particleSpread: 1.5 },
}

const MAX_ACTIVE_EFFECTS = 500
const MIN_DURATION = 30
const MAX_DURATION = 60

export class TerraformingSystem {
  private effects: TerraformEffect[] = []

  addEffect(x: number, y: number, fromTile: TileType, toTile: TileType, effectType: TerraformEffectType): void {
    if (this.effects.length >= MAX_ACTIVE_EFFECTS) return
    // Don't stack effects on the same tile
    for (let i = 0; i < this.effects.length; i++) {
      if (this.effects[i].x === x && this.effects[i].y === y) return
    }
    this.effects.push({
      x, y, fromTile, toTile, effectType,
      progress: 0,
      duration: MIN_DURATION + Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1)),
      elapsed: 0,
      particleCooldown: 0,
      _cachedColor: TILE_COLORS[fromTile][0],
      _lastProgressQ: -1,
    })
  }

  update(world: World, particles: ParticleSystem, tick: number): void {
    let i = 0
    while (i < this.effects.length) {
      const e = this.effects[i]
      e.elapsed++
      e.progress = Math.min(e.elapsed / e.duration, 1)

      // Spawn particles periodically
      const cfg = EFFECT_CONFIGS[e.effectType]
      e.particleCooldown--
      if (e.particleCooldown <= 0) {
        e.particleCooldown = cfg.particleInterval
        const wx = e.x * TILE_SIZE + TILE_SIZE * 0.5
        const wy = e.y * TILE_SIZE + TILE_SIZE * 0.5
        const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * cfg.particleSpread + 0.3
        particles.addParticle(
          wx, wy,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - (e.effectType === 'burn' ? 0.8 : 0),
          15 + Math.random() * 15,
          30,
          color,
          1 + Math.random(),
        )
      }

      // Effect complete — apply terrain change
      if (e.progress >= 1) {
        world.setTile(e.x, e.y, e.toTile)
        // Final burst
        const wx = e.x * TILE_SIZE + TILE_SIZE * 0.5
        const wy = e.y * TILE_SIZE + TILE_SIZE * 0.5
        const burstColor = cfg.colors[0]
        particles.spawn(wx, wy, 4, burstColor, 1.5)
        // Swap-and-pop removal
        this.effects[i] = this.effects[this.effects.length - 1]
        this.effects.pop()
        continue
      }
      i++
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    if (this.effects.length === 0) return

    const invZoom = 1 / zoom
    // Viewport bounds in tile coords for culling
    const vl = cameraX * invZoom
    const vt = cameraY * invZoom
    const vr = vl + ctx.canvas.width * invZoom
    const vb = vt + ctx.canvas.height * invZoom
    const tileL = Math.floor(vl / TILE_SIZE) - 1
    const tileR = Math.ceil(vr / TILE_SIZE) + 1
    const tileT = Math.floor(vt / TILE_SIZE) - 1
    const tileB = Math.ceil(vb / TILE_SIZE) + 1

    for (let i = 0; i < this.effects.length; i++) {
      const e = this.effects[i]
      // Frustum cull
      if (e.x < tileL || e.x > tileR || e.y < tileT || e.y > tileB) continue

      const sx = e.x * TILE_SIZE * zoom - cameraX
      const sy = e.y * TILE_SIZE * zoom - cameraY
      const sz = TILE_SIZE * zoom
      const t = e.progress

      // Blend from-color toward to-color — use cached string, update only when quantized progress changes
      const pq = Math.round(t * 50)
      if (pq !== e._lastProgressQ) {
        e._lastProgressQ = pq
        const fromColors = TILE_COLORS[e.fromTile]
        const toColors = TILE_COLORS[e.toTile]
        e._cachedColor = this.lerpColor(fromColors[0], toColors[0], t)
      }

      ctx.globalAlpha = 0.7 + t * 0.3
      ctx.fillStyle = e._cachedColor
      ctx.fillRect(sx, sy, sz, sz)

      // Overlay glow for active effects
      if (t < 1) {
        const cfg = EFFECT_CONFIGS[e.effectType]
        const pulse = 0.15 + Math.sin(t * Math.PI) * 0.2
        ctx.globalAlpha = pulse
        ctx.fillStyle = cfg.colors[0]
        ctx.fillRect(sx, sy, sz, sz)
      }
    }
    ctx.globalAlpha = 1
  }

  getActiveEffects(): TerraformEffect[] {
    return this.effects
  }

  get activeCount(): number {
    return this.effects.length
  }

  // Simple hex color lerp
  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16)
    const ag = parseInt(a.slice(3, 5), 16)
    const ab = parseInt(a.slice(5, 7), 16)
    const br = parseInt(b.slice(1, 3), 16)
    const bg = parseInt(b.slice(3, 5), 16)
    const bb = parseInt(b.slice(5, 7), 16)
    const r = Math.round(ar + (br - ar) * t)
    const g = Math.round(ag + (bg - ag) * t)
    const bl = Math.round(ab + (bb - ab) * t)
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)
  }
}
