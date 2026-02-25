/** FlockingSystem - group behavior, flocking, and coordinated creature movement */
import { EntityManager, EntityId, PositionComponent, VelocityComponent, CreatureComponent, AIComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'

interface FlockData {
  centroidX: number; centroidY: number
  avgVx: number; avgVy: number
  count: number
  members: EntityId[]
}

const FLOCK_RADIUS = 8
const SEPARATION_DIST = 1.5
const COHESION_WEIGHT = 0.02
const ALIGNMENT_WEIGHT = 0.05
const SEPARATION_WEIGHT = 0.15
const FLOCK_SCAN_INTERVAL = 15

export class FlockingSystem {
  private flocks: Map<string, FlockData> = new Map()  // key = civId:species
  private flockAssignment: Map<EntityId, string> = new Map()

  update(tick: number, em: EntityManager): void {
    // Rebuild flocks periodically
    if (tick % FLOCK_SCAN_INTERVAL === 0) {
      this.rebuildFlocks(em)
    }

    // Apply flocking forces
    for (const [_key, flock] of this.flocks) {
      if (flock.count < 3) continue

      for (const eid of flock.members) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        const vel = em.getComponent<VelocityComponent>(eid, 'velocity')
        const ai = em.getComponent<AIComponent>(eid, 'ai')
        if (!pos || !vel || !ai) continue

        // Only apply flocking to wandering/idle creatures
        if (ai.state !== 'wandering' && ai.state !== 'idle') continue

        let sepX = 0, sepY = 0

        // Separation: avoid crowding neighbors
        for (const other of flock.members) {
          if (other === eid) continue
          const oPos = em.getComponent<PositionComponent>(other, 'position')
          if (!oPos) continue
          const dx = pos.x - oPos.x
          const dy = pos.y - oPos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < SEPARATION_DIST && dist > 0) {
            sepX += dx / dist
            sepY += dy / dist
          }
        }

        // Cohesion: steer toward flock center
        const cohX = (flock.centroidX - pos.x) * COHESION_WEIGHT
        const cohY = (flock.centroidY - pos.y) * COHESION_WEIGHT

        // Alignment: match flock velocity
        const aliX = (flock.avgVx - vel.vx) * ALIGNMENT_WEIGHT
        const aliY = (flock.avgVy - vel.vy) * ALIGNMENT_WEIGHT

        // Apply forces
        vel.vx += sepX * SEPARATION_WEIGHT + cohX + aliX
        vel.vy += sepY * SEPARATION_WEIGHT + cohY + aliY

        // Clamp velocity
        const creature = em.getComponent<CreatureComponent>(eid, 'creature')
        const maxSpeed = creature?.speed ?? 2
        const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy)
        if (speed > maxSpeed) {
          vel.vx = (vel.vx / speed) * maxSpeed
          vel.vy = (vel.vy / speed) * maxSpeed
        }
      }
    }
  }

  private rebuildFlocks(em: EntityManager): void {
    this.flocks.clear()
    this.flockAssignment.clear()

    const entities = em.getEntitiesWithComponents('position', 'creature', 'velocity')

    // Group by civ + species
    const groups = new Map<string, EntityId[]>()
    for (const eid of entities) {
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')!
      const civMember = em.getComponent<CivMemberComponent>(eid, 'civMember')
      const key = `${civMember?.civId ?? -1}:${creature.species}`

      const group = groups.get(key)
      if (group) group.push(eid)
      else groups.set(key, [eid])
    }

    // Build spatial flocks within each group
    for (const [key, members] of groups) {
      if (members.length < 3) continue

      // Simple clustering: find nearby members
      const assigned = new Set<EntityId>()

      for (const eid of members) {
        if (assigned.has(eid)) continue
        const pos = em.getComponent<PositionComponent>(eid, 'position')!

        const nearby: EntityId[] = [eid]
        assigned.add(eid)

        for (const other of members) {
          if (assigned.has(other)) continue
          const oPos = em.getComponent<PositionComponent>(other, 'position')!
          const dx = pos.x - oPos.x
          const dy = pos.y - oPos.y
          if (dx * dx + dy * dy < FLOCK_RADIUS * FLOCK_RADIUS) {
            nearby.push(other)
            assigned.add(other)
          }
        }

        if (nearby.length < 3) continue

        // Compute flock data
        let cx = 0, cy = 0, vx = 0, vy = 0
        for (const nid of nearby) {
          const p = em.getComponent<PositionComponent>(nid, 'position')!
          const v = em.getComponent<VelocityComponent>(nid, 'velocity')!
          cx += p.x; cy += p.y
          vx += v.vx; vy += v.vy
        }
        const n = nearby.length
        const flockKey = `${key}:${Math.floor(pos.x)}:${Math.floor(pos.y)}`

        this.flocks.set(flockKey, {
          centroidX: cx / n, centroidY: cy / n,
          avgVx: vx / n, avgVy: vy / n,
          count: n, members: nearby,
        })

        for (const nid of nearby) {
          this.flockAssignment.set(nid, flockKey)
        }
      }
    }
  }

  /** Render flock debug visualization */
  renderDebug(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, zoom: number
  ): void {
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.strokeStyle = '#88aaff'
    ctx.lineWidth = 1

    for (const flock of this.flocks.values()) {
      if (flock.count < 3) continue
      const sx = (flock.centroidX - camX) * zoom
      const sy = (flock.centroidY - camY) * zoom

      // Draw flock radius
      ctx.beginPath()
      ctx.arc(sx, sy, FLOCK_RADIUS * zoom * 0.5, 0, Math.PI * 2)
      ctx.stroke()

      // Draw flock direction
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + flock.avgVx * zoom * 2, sy + flock.avgVy * zoom * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.2
    }

    ctx.restore()
  }

  getFlockCount(): number {
    return this.flocks.size
  }

  getFlockOf(entityId: EntityId): string | null {
    return this.flockAssignment.get(entityId) ?? null
  }
}
