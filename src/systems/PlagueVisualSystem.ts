import { TILE_SIZE } from '../utils/Constants'

export interface InfectedZone {
  x: number
  y: number
  severity: number // 0-1
}

export interface QuarantineZone {
  x: number
  y: number
  width: number
  height: number
}

interface PlagueParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

const MAX_PARTICLES = 200
const SPAWN_CHANCE = 0.05
const MIN_LIFE = 60
const MAX_LIFE = 120

// Infection color stops
const LIGHT_R = 80, LIGHT_G = 200, LIGHT_B = 80, LIGHT_A = 0.15
const DARK_R = 120, DARK_G = 40, DARK_B = 160, DARK_A = 0.35

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class PlagueVisualSystem {
  private zones: InfectedZone[] = []
  private quarantines: QuarantineZone[] = []
  private visible: boolean = true
  private particles: PlagueParticle[] = []

  setInfectedZones(zones: InfectedZone[]): void {
    this.zones = zones
  }

  setQuarantineZones(zones: QuarantineZone[]): void {
    this.quarantines = zones
  }

  toggle(): void {
    this.visible = !this.visible
  }

  update(): void {
    if (!this.visible) return

    // Spawn new particles from infected zones
    for (const zone of this.zones) {
      if (this.particles.length >= MAX_PARTICLES) break
      if (Math.random() < SPAWN_CHANCE) {
        const maxLife = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE)
        this.particles.push({
          x: (zone.x + Math.random()) * TILE_SIZE,
          y: (zone.y + Math.random()) * TILE_SIZE,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2 - Math.random() * 0.3,
          life: maxLife,
          maxLife,
        })
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1]
        this.particles.pop()
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    if (!this.visible) return

    ctx.save()

    // Draw infected zone overlays
    const tileScreen = TILE_SIZE * zoom
    for (const zone of this.zones) {
      const sx = (zone.x * TILE_SIZE - cameraX) * zoom
      const sy = (zone.y * TILE_SIZE - cameraY) * zoom
      const s = zone.severity
      const r = Math.round(lerp(LIGHT_R, DARK_R, s))
      const g = Math.round(lerp(LIGHT_G, DARK_G, s))
      const b = Math.round(lerp(LIGHT_B, DARK_B, s))
      const a = lerp(LIGHT_A, DARK_A, s)
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`
      ctx.fillRect(sx, sy, tileScreen, tileScreen)
    }

    // Draw plague particles
    for (const p of this.particles) {
      const sx = (p.x - cameraX) * zoom
      const sy = (p.y - cameraY) * zoom
      const alpha = (p.life / p.maxLife) * 0.6
      const radius = 2 * zoom
      ctx.fillStyle = `rgba(100,180,60,${alpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw quarantine borders
    ctx.strokeStyle = 'rgba(220,40,40,0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    for (const q of this.quarantines) {
      const sx = (q.x * TILE_SIZE - cameraX) * zoom
      const sy = (q.y * TILE_SIZE - cameraY) * zoom
      const sw = q.width * TILE_SIZE * zoom
      const sh = q.height * TILE_SIZE * zoom
      ctx.strokeRect(sx, sy, sw, sh)
    }

    ctx.restore()
  }
}
