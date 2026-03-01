/** ReligionSpreadSystem - temple icons, faith particles, religion visualization */
import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ReligionType = 'sun' | 'moon' | 'nature' | 'war' | 'sea' | 'ancestor'

export interface TempleComponent {
  type: 'temple'
  religion: ReligionType
  civId: number
  faithRadius: number
  faithStrength: number  // 0-100
  level: number          // 1-3
}

interface FaithParticle {
  x: number; y: number
  tx: number; ty: number
  life: number; maxLife: number
  color: string; size: number
}

const RELIGION_COLORS: Record<ReligionType, string> = {
  sun: '#ffd700', moon: '#c0c0ff', nature: '#44cc44',
  war: '#ff4444', sea: '#4488ff', ancestor: '#cc88ff',
}

const RELIGION_SYMBOLS: Record<ReligionType, string> = {
  sun: '☀', moon: '☽', nature: '🌿', war: '⚔', sea: '🌊', ancestor: '👁',
}

const SPREAD_INTERVAL = 60
const MAX_PARTICLES = 200
const PARTICLE_SPEED = 0.3

export class ReligionSpreadSystem {
  private temples: Map<EntityId, TempleComponent> = new Map()
  /** Fixed-size particle pool — maxLife=0 means inactive slot */
  private readonly particles: FaithParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    x: 0, y: 0, tx: 0, ty: 0, life: 0, maxLife: 0, color: '', size: 1,
  }))
  private faithMap: Map<number, { religion: ReligionType; strength: number }> = new Map()
  private _lastZoom = -1
  private _symbolFont = ''
  // Per-level font cache (level 1-3, index 0-2), invalidated when zoom changes
  private _templeFonts: [string, string, string] = ['', '', '']

  registerTemple(entityId: EntityId, temple: TempleComponent): void {
    this.temples.set(entityId, temple)
  }

  removeTemple(entityId: EntityId): void {
    this.temples.delete(entityId)
  }

  update(tick: number, em: EntityManager, _civManager: CivManager): void {
    // Spread faith from temples periodically
    if (tick % SPREAD_INTERVAL === 0) {
      for (const [eid, temple] of this.temples) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue

        const r = temple.faithRadius
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const key = Math.floor(pos.x + dx) * 10000 + Math.floor(pos.y + dy)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const strength = r > 0 ? temple.faithStrength * (1 - dist / r) * temple.level * 0.5 : 0
            const existing = this.faithMap.get(key)
            if (!existing || existing.strength < strength) {
              this.faithMap.set(key, { religion: temple.religion, strength })
            }
          }
        }

        // Spawn faith particles — find inactive slot in pool
        for (let pi = 0; pi < this.particles.length; pi++) {
          if (this.particles[pi].maxLife > 0) continue;
          const angle = Math.random() * Math.PI * 2
          const dist = Math.random() * temple.faithRadius
          const p = this.particles[pi]
          p.x = pos.x; p.y = pos.y
          p.tx = pos.x + Math.cos(angle) * dist
          p.ty = pos.y + Math.sin(angle) * dist
          p.life = 0; p.maxLife = 60 + Math.random() * 60
          p.color = RELIGION_COLORS[temple.religion]
          p.size = 1.5 + temple.level * 0.5
          break
        }
      }
    }

    // Update particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (p.maxLife <= 0) continue  // inactive slot
      p.life++
      const t = p.life / p.maxLife
      p.x += (p.tx - p.x) * PARTICLE_SPEED * 0.1
      p.y += (p.ty - p.y) * PARTICLE_SPEED * 0.1
      if (t >= 1) {
        p.maxLife = 0  // mark slot as inactive
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._symbolFont = `${Math.max(12, zoom * 0.8)}px serif`
    }
    // Render faith influence zones
    ctx.save()
    ctx.globalAlpha = 0.08
    for (const [numKey, faith] of this.faithMap) {
      const wx = Math.floor(numKey / 10000)
      const wy = numKey % 10000
      const sx = (wx - camX) * zoom
      const sy = (wy - camY) * zoom
      ctx.fillStyle = RELIGION_COLORS[faith.religion]
      ctx.fillRect(sx, sy, zoom, zoom)
    }
    ctx.restore()

    // Render particles
    ctx.save()
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (p.maxLife <= 0) continue  // inactive slot
      const sx = (p.x - camX) * zoom
      const sy = (p.y - camY) * zoom
      const alpha = 1 - p.life / p.maxLife
      ctx.globalAlpha = alpha * 0.7
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(sx, sy, p.size * zoom * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Render temple icons
    ctx.save()
    ctx.font = this._symbolFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [_eid, _temple] of this.temples) {
      // We need position from EM but don't have it here - use cached
    }
    ctx.restore()
  }

  /** Render temple symbols (call with entity positions) */
  renderTemples(
    ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number,
    em: EntityManager
  ): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      const base = Math.max(14, zoom * 0.8)
      this._templeFonts[0] = `${base * 1.2}px serif`
      this._templeFonts[1] = `${base * 1.4}px serif`
      this._templeFonts[2] = `${base * 1.6}px serif`
    }
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [eid, temple] of this.temples) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue
      const sx = (pos.x - camX) * zoom
      const sy = (pos.y - camY) * zoom
      ctx.font = this._templeFonts[Math.min(2, temple.level - 1)]
      ctx.globalAlpha = 0.9
      ctx.fillText(RELIGION_SYMBOLS[temple.religion], sx, sy)

      // Faith radius ring
      ctx.globalAlpha = 0.15
      ctx.strokeStyle = RELIGION_COLORS[temple.religion]
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(sx, sy, temple.faithRadius * zoom, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  getFaithAt(wx: number, wy: number): { religion: ReligionType; strength: number } | null {
    return this.faithMap.get(wx * 10000 + wy) ?? null
  }

  getDominantReligion(civId: number): ReligionType | null {
    // Accumulate per-religion strength using a plain object (zero-alloc)
    const counts: Partial<Record<ReligionType, number>> = {}
    for (const temple of this.temples.values()) {
      if (temple.civId === civId) {
        counts[temple.religion] = (counts[temple.religion] ?? 0) + temple.faithStrength
      }
    }
    let best: ReligionType | null = null
    let bestVal = 0
    for (const r in counts) {
      const v = counts[r as ReligionType]!
      if (v > bestVal) { best = r as ReligionType; bestVal = v }
    }
    return best
  }

  getTempleCount(): number {
    return this.temples.size
  }

  getParticleCount(): number {
    let count = 0
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].maxLife > 0) count++
    }
    return count
  }
}
