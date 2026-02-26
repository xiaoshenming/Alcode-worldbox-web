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
  private particles: FaithParticle[] = []
  private faithMap: Map<string, { religion: ReligionType; strength: number }> = new Map()

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
            const key = `${Math.floor(pos.x + dx)},${Math.floor(pos.y + dy)}`
            const dist = Math.sqrt(dx * dx + dy * dy)
            const strength = r > 0 ? temple.faithStrength * (1 - dist / r) * temple.level * 0.5 : 0
            const existing = this.faithMap.get(key)
            if (!existing || existing.strength < strength) {
              this.faithMap.set(key, { religion: temple.religion, strength })
            }
          }
        }

        // Spawn faith particles
        if (this.particles.length < MAX_PARTICLES) {
          const angle = Math.random() * Math.PI * 2
          const dist = Math.random() * temple.faithRadius
          this.particles.push({
            x: pos.x, y: pos.y,
            tx: pos.x + Math.cos(angle) * dist,
            ty: pos.y + Math.sin(angle) * dist,
            life: 0, maxLife: 60 + Math.random() * 60,
            color: RELIGION_COLORS[temple.religion],
            size: 1.5 + temple.level * 0.5,
          })
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life++
      const t = p.life / p.maxLife
      p.x += (p.tx - p.x) * PARTICLE_SPEED * 0.1
      p.y += (p.ty - p.y) * PARTICLE_SPEED * 0.1
      if (t >= 1) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    // Render faith influence zones
    ctx.save()
    ctx.globalAlpha = 0.08
    for (const [key, faith] of this.faithMap) {
      const [xStr, yStr] = key.split(',')
      const wx = parseInt(xStr)
      const wy = parseInt(yStr)
      const sx = (wx - camX) * zoom
      const sy = (wy - camY) * zoom
      ctx.fillStyle = RELIGION_COLORS[faith.religion]
      ctx.fillRect(sx, sy, zoom, zoom)
    }
    ctx.restore()

    // Render particles
    ctx.save()
    for (const p of this.particles) {
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
    ctx.font = `${Math.max(12, zoom * 0.8)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [eid, temple] of this.temples) {
      const pos = ctx.canvas.parentElement
        ? undefined
        : undefined
      // We need position from EM but don't have it here - use cached
    }
    ctx.restore()
  }

  /** Render temple symbols (call with entity positions) */
  renderTemples(
    ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number,
    em: EntityManager
  ): void {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [eid, temple] of this.temples) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue
      const sx = (pos.x - camX) * zoom
      const sy = (pos.y - camY) * zoom
      const size = Math.max(14, zoom * 0.8) * (1 + temple.level * 0.2)
      ctx.font = `${size}px serif`
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
    return this.faithMap.get(`${wx},${wy}`) ?? null
  }

  getDominantReligion(civId: number): ReligionType | null {
    const counts = new Map<ReligionType, number>()
    for (const temple of this.temples.values()) {
      if (temple.civId === civId) {
        counts.set(temple.religion, (counts.get(temple.religion) ?? 0) + temple.faithStrength)
      }
    }
    let best: ReligionType | null = null
    let bestVal = 0
    for (const [r, v] of counts) {
      if (v > bestVal) { best = r; bestVal = v }
    }
    return best
  }

  getTempleCount(): number {
    return this.temples.size
  }

  getParticleCount(): number {
    return this.particles.length
  }
}
