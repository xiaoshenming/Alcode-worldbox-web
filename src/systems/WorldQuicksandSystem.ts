// World Quicksand System (v3.133) - Quicksand pits in desert and beach areas
// Quicksand traps shift in depth and radius over time

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface QuicksandPit {
  id: number
  x: number
  y: number
  depth: number
  viscosity: number
  radius: number
  trappedCount: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 2800
const SPAWN_CHANCE = 0.004
const MAX_PITS = 15

export class WorldQuicksandSystem {
  private pits: QuicksandPit[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pits.length < MAX_PITS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Sand/beach (2) or desert-like terrain (3)
      if (tile != null && (tile === 2 || tile === 3)) {
        this.pits.push({
          id: this.nextId++,
          x, y,
          depth: 1 + Math.floor(Math.random() * 3),
          viscosity: 0.3 + Math.random() * 0.7,
          radius: 1 + Math.floor(Math.random() * 3),
          trappedCount: 0,
          active: true,
          tick,
        })
      }
    }

    for (const p of this.pits) {
      // Depth fluctuates over time
      if (Math.random() < 0.015) {
        p.depth = Math.max(1, Math.min(10, p.depth + (Math.random() < 0.5 ? 1 : -1)))
      }
      // Radius slowly expands
      if (Math.random() < 0.005) {
        p.radius = Math.min(8, p.radius + 1)
      }
      // Trap nearby creatures
      const nearby = em.getEntitiesWithComponent('position')
      for (const eid of nearby) {
        const pos = em.getComponent(eid, 'position') as unknown as { x: number; y: number } | null
        if (pos && Math.abs(pos.x - p.x) <= p.radius && Math.abs(pos.y - p.y) <= p.radius) {
          if (Math.random() < 0.002 * p.viscosity) {
            p.trappedCount++
          }
        }
      }
      // Old pits dry up
      const age = tick - p.tick
      if (age > 250000 && Math.random() < 0.001) {
        p.active = false
      }
    }

    for (let i = this.pits.length - 1; i >= 0; i--) {
      if (!this.pits[i].active) this.pits.splice(i, 1)
    }
  }

  getPits(): readonly QuicksandPit[] { return this.pits }
}
