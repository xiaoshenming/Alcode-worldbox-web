/**
 * WorldLeyLineSystem — Mystical energy lines (ley lines) that crisscross the world map.
 * Intersections form power nexuses that buff nearby creatures and buildings.
 * Energy pulses over world age; lines render as glowing bezier curves.
 */

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../utils/Constants'

/** A single ley line defined by bezier control points */
interface LeyLine {
  id: number
  points: Array<{ x: number; y: number }>  // 4 control points for cubic bezier
  energy: number  // 0-1
  color: string
}

/** An energy nexus formed at ley line intersections */
interface PowerNexus {
  x: number
  y: number
  energy: number
  radius: number
}

// Configuration
const MIN_LEY_LINES = 3
const MAX_LEY_LINES = 6
const NEXUS_MERGE_DIST = 15
const BUFF_RADIUS = 12
const NEXUS_BUFF_RADIUS = 18
const SPEED_BUFF = 1.2
const DAMAGE_BUFF = 1.15
const ENERGY_PULSE_SPEED = 0.0003
const BEZIER_SAMPLES = 40
const LINE_PROXIMITY_THRESHOLD = 6

const LEY_COLORS = [
  '#4fc3f7', '#ab47bc', '#66bb6a', '#ffa726', '#ef5350', '#26c6da',
]

export class WorldLeyLineSystem {
  private leyLines: LeyLine[] = []
  private nexuses: PowerNexus[] = []
  private initialized = false
  private worldAge = 0
  private _ex = 0
  private _ey = 0

  /** Initialize ley lines with random bezier curves across the map */
  private initialize(): void {
    const count = MIN_LEY_LINES + Math.floor(Math.random() * (MAX_LEY_LINES - MIN_LEY_LINES + 1))
    const m = 10, w = WORLD_WIDTH - m * 2, h = WORLD_HEIGHT - m * 2
    const rp = () => ({ x: m + Math.random() * w, y: m + Math.random() * h })

    for (let i = 0; i < count; i++) {
      this.leyLines.push({
        id: i, points: [rp(), rp(), rp(), rp()],
        energy: 0.5 + Math.random() * 0.5, color: LEY_COLORS[i % LEY_COLORS.length],
      })
    }

    this.computeNexuses()
    this.initialized = true
  }

  /** Find intersections between ley lines to create power nexuses */
  private computeNexuses(): void {
    this.nexuses = []
    const candidates: Array<{ x: number; y: number }> = []

    // Sample points along each line and check proximity to other lines
    for (let i = 0; i < this.leyLines.length; i++) {
      for (let j = i + 1; j < this.leyLines.length; j++) {
        const samplesA = this.sampleBezier(this.leyLines[i].points)
        const samplesB = this.sampleBezier(this.leyLines[j].points)

        for (const a of samplesA) {
          for (const b of samplesB) {
            const dx = a.x - b.x
            const dy = a.y - b.y
            if (dx * dx + dy * dy < LINE_PROXIMITY_THRESHOLD * LINE_PROXIMITY_THRESHOLD) {
              candidates.push({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 })
            }
          }
        }
      }
    }

    // Merge nearby candidates into single nexuses
    const merged: Array<{ x: number; y: number; count: number }> = []
    for (const c of candidates) {
      const existing = merged.find(m => {
        const dx = c.x - m.x, dy = c.y - m.y
        return dx * dx + dy * dy < NEXUS_MERGE_DIST * NEXUS_MERGE_DIST
      })
      if (existing) {
        existing.x = (existing.x * existing.count + c.x) / (existing.count + 1)
        existing.y = (existing.y * existing.count + c.y) / (existing.count + 1)
        existing.count++
      } else {
        merged.push({ x: c.x, y: c.y, count: 1 })
      }
    }
    for (const m of merged) {
      this.nexuses.push({ x: m.x, y: m.y, energy: 0.6 + Math.random() * 0.4, radius: NEXUS_BUFF_RADIUS })
    }
  }

  /** Sample points along a cubic bezier curve */
  private sampleBezier(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = []
    const steps = Math.floor(BEZIER_SAMPLES * 0.5) // coarser for intersection detection
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      this.evalCubicBezier(pts, t)
      result.push({ x: this._ex, y: this._ey })
    }
    return result
  }

  /** Evaluate cubic bezier at parameter t, write result into _ex/_ey */
  private evalCubicBezier(pts: Array<{ x: number; y: number }>, t: number): void {
    const u = 1 - t, u2 = u * u, u3 = u2 * u, t2 = t * t, t3 = t2 * t
    this._ex = u3 * pts[0].x + 3 * u2 * t * pts[1].x + 3 * u * t2 * pts[2].x + t3 * pts[3].x
    this._ey = u3 * pts[0].y + 3 * u2 * t * pts[1].y + 3 * u * t2 * pts[2].y + t3 * pts[3].y
  }

  /** Distance from a point to the nearest sample on a ley line */
  private distToLine(px: number, py: number, line: LeyLine): number {
    let minDist = Infinity
    for (let i = 0; i <= BEZIER_SAMPLES; i++) {
      this.evalCubicBezier(line.points, i / BEZIER_SAMPLES)
      const dx = px - this._ex, dy = py - this._ey
      const d = dx * dx + dy * dy
      if (d < minDist) minDist = d
    }
    return Math.sqrt(minDist)
  }

  /** Update ley line energy pulsation and apply buffs to nearby creatures. */
  update(dt: number, em: EntityManager, tick: number): void {
    if (!this.initialized) this.initialize()

    this.worldAge += dt

    // Pulse energy
    for (const line of this.leyLines)
      line.energy = 0.5 + 0.5 * Math.sin(this.worldAge * ENERGY_PULSE_SPEED * Math.PI * 2 + line.id * 1.7)
    for (const nexus of this.nexuses)
      nexus.energy = 0.6 + 0.4 * Math.sin(this.worldAge * ENERGY_PULSE_SPEED * Math.PI * 2 + nexus.x * 0.1)

    // Apply buffs every 30 ticks to avoid per-frame cost
    if (tick % 30 !== 0) return

    const creatures = em.getEntitiesWithComponents('position', 'creature')
    for (const eid of creatures) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!pos || !creature) continue

      let nearLine = false
      for (const line of this.leyLines) {
        if (this.distToLine(pos.x, pos.y, line) < BUFF_RADIUS) {
          nearLine = true
          break
        }
      }

      let nearNexus = false
      for (const nexus of this.nexuses) {
        const dx = pos.x - nexus.x
        const dy = pos.y - nexus.y
        if (dx * dx + dy * dy < nexus.radius * nexus.radius) {
          nearNexus = true
          break
        }
      }

      // Buff: nexus > line > none
      if (nearNexus) {
        creature.speed *= SPEED_BUFF * 1.1; creature.damage *= DAMAGE_BUFF * 1.1
      } else if (nearLine) {
        creature.speed *= SPEED_BUFF; creature.damage *= DAMAGE_BUFF
      }
    }
  }

  /** Render ley lines as glowing bezier curves and nexuses as pulsating circles. */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (!this.initialized) return

    const tileZoom = TILE_SIZE * zoom
    const pulse = Math.sin(this.worldAge * ENERGY_PULSE_SPEED * Math.PI * 20)

    ctx.save()

    // Draw ley lines
    for (const line of this.leyLines) {
      const alpha = 0.15 + 0.15 * line.energy + 0.05 * pulse
      const width = Math.max(1, (1.5 + line.energy) * zoom)

      // Outer glow
      ctx.globalAlpha = alpha * 0.4
      ctx.strokeStyle = line.color
      ctx.lineWidth = width * 3
      ctx.lineCap = 'round'
      this.strokeBezierPath(ctx, line.points, camX, camY, tileZoom)

      // Core line
      ctx.globalAlpha = alpha
      ctx.lineWidth = width
      this.strokeBezierPath(ctx, line.points, camX, camY, tileZoom)
    }

    // Draw nexuses
    for (const nexus of this.nexuses) {
      const sx = (nexus.x - camX) * tileZoom
      const sy = (nexus.y - camY) * tileZoom
      const baseR = Math.max(3, 8 * zoom)
      const pulseR = baseR * (1 + 0.2 * nexus.energy * pulse)

      // Outer glow ring — two layered arcs replacing createRadialGradient to avoid per-nexus allocation
      ctx.globalAlpha = 0.12 + 0.08 * nexus.energy
      ctx.fillStyle = 'rgba(100,60,200,0.25)'
      ctx.beginPath()
      ctx.arc(sx, sy, pulseR * 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(180,140,255,0.3)'
      ctx.beginPath()
      ctx.arc(sx, sy, pulseR * 1.2, 0, Math.PI * 2)
      ctx.fill()

      // Bright core
      ctx.globalAlpha = 0.5 + 0.3 * nexus.energy
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(sx, sy, pulseR * 0.4, 0, Math.PI * 2)
      ctx.fill()

      // Pulsating ring
      ctx.globalAlpha = 0.3 + 0.2 * pulse * nexus.energy
      ctx.strokeStyle = 'rgba(180,140,255,0.7)'
      ctx.lineWidth = Math.max(1, 1.5 * zoom)
      ctx.beginPath()
      ctx.arc(sx, sy, pulseR, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  /** Stroke a cubic bezier path on the canvas in screen coordinates */
  private strokeBezierPath(
    ctx: CanvasRenderingContext2D,
    pts: Array<{ x: number; y: number }>,
    camX: number, camY: number, tileZoom: number,
  ): void {
    ctx.beginPath()
    ctx.moveTo((pts[0].x - camX) * tileZoom, (pts[0].y - camY) * tileZoom)
    ctx.bezierCurveTo(
      (pts[1].x - camX) * tileZoom, (pts[1].y - camY) * tileZoom,
      (pts[2].x - camX) * tileZoom, (pts[2].y - camY) * tileZoom,
      (pts[3].x - camX) * tileZoom, (pts[3].y - camY) * tileZoom,
    )
    ctx.stroke()
  }

  /** Get all ley lines (read-only access for other systems) */
  getLeyLines(): ReadonlyArray<LeyLine> {
    return this.leyLines
  }

  /** Get all power nexuses (read-only access for other systems) */
  getNexuses(): ReadonlyArray<PowerNexus> {
    return this.nexuses
  }

  /** Check if a position is near a ley line */
  isNearLeyLine(x: number, y: number): boolean {
    for (const line of this.leyLines) {
      if (this.distToLine(x, y, line) < BUFF_RADIUS) return true
    }
    return false
  }

  /** Reset the system for a new world */
  clear(): void {
    this.leyLines = []
    this.nexuses = []
    this.initialized = false
    this.worldAge = 0
  }
}
