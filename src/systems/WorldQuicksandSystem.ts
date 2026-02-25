// World Quicksand System (v3.17) - Quicksand traps appear in desert terrain
// Creatures walking over quicksand get trapped and sink, needing rescue

import { EntityManager, CreatureComponent, PositionComponent, NeedsComponent } from '../ecs/Entity'

export interface Quicksand {
  id: number
  x: number
  y: number
  depth: number           // 1-10
  trappedEntities: number[]
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 400
const SPAWN_CHANCE = 0.005
const MAX_QUICKSAND = 25
const SINK_RATE = 0.5
const RESCUE_RANGE = 6
const RESCUE_CHANCE = 0.15

export class WorldQuicksandSystem {
  private quicksands: Quicksand[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: { width: number; height: number; getTile(x: number, y: number): number | null; tiles: number[][] }, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnQuicksand(world, tick)
    this.trapCreatures(em)
    this.sinkTrapped(em)
    this.attemptRescues(em)
    this.cleanup()
  }

  private spawnQuicksand(world: { width: number; height: number; getTile(x: number, y: number): number | null }, tick: number): void {
    if (this.quicksands.length >= MAX_QUICKSAND) return
    if (Math.random() > SPAWN_CHANCE) return

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 2 + Math.floor(Math.random() * (world.width - 4))
      const y = 2 + Math.floor(Math.random() * (world.height - 4))
      const tile = world.getTile(x, y)
      // Sand tile type is typically 3 (beach/sand)
      if (tile !== 3) continue

      // Check not too close to existing quicksand
      const tooClose = this.quicksands.some(q => {
        const dx = q.x - x, dy = q.y - y
        return dx * dx + dy * dy < 25
      })
      if (tooClose) continue

      this.quicksands.push({
        id: this.nextId++,
        x, y,
        depth: 1 + Math.floor(Math.random() * 5),
        trappedEntities: [],
        active: true,
        tick,
      })
      break
    }
  }

  private trapCreatures(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('creature', 'position')
    for (const qs of this.quicksands) {
      if (!qs.active) continue
      for (const eid of entities) {
        if (qs.trappedEntities.includes(eid)) continue
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - qs.x
        const dy = pos.y - qs.y
        if (dx * dx + dy * dy < 4) {
          qs.trappedEntities.push(eid)
          if (qs.trappedEntities.length >= 5) break
        }
      }
    }
  }

  private sinkTrapped(em: EntityManager): void {
    for (const qs of this.quicksands) {
      if (!qs.active) continue
      qs.trappedEntities = qs.trappedEntities.filter(eid => {
        const needs = em.getComponent<NeedsComponent>(eid, 'needs')
        if (!needs || needs.health <= 0) return false
        needs.health -= SINK_RATE * qs.depth
        if (needs.health <= 0) {
          qs.depth = Math.min(10, qs.depth + 1)
          return false
        }
        return true
      })
    }
  }

  private attemptRescues(em: EntityManager): void {
    for (const qs of this.quicksands) {
      if (qs.trappedEntities.length === 0) continue
      const entities = em.getEntitiesWithComponents('creature', 'position')
      for (const eid of entities) {
        if (qs.trappedEntities.includes(eid)) continue
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - qs.x
        const dy = pos.y - qs.y
        if (dx * dx + dy * dy < RESCUE_RANGE * RESCUE_RANGE && Math.random() < RESCUE_CHANCE) {
          qs.trappedEntities.shift()
          break
        }
      }
    }
  }

  private cleanup(): void {
    for (let i = this.quicksands.length - 1; i >= 0; i--) {
      const qs = this.quicksands[i]
      if (!qs.active) {
        this.quicksands.splice(i, 1)
      }
    }
  }

  getQuicksands(): Quicksand[] { return this.quicksands }
  getActiveQuicksands(): Quicksand[] { return this.quicksands.filter(q => q.active) }
  getTrappedCount(): number { return this.quicksands.reduce((sum, q) => sum + q.trappedEntities.length, 0) }
}
