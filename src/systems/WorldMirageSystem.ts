// World Mirage System (v3.50) - Mirages appear in desert/sand areas
// Mirages confuse creatures, causing them to wander toward illusions

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type MirageType = 'oasis' | 'city' | 'mountain' | 'forest'

export interface Mirage {
  id: number
  x: number
  y: number
  type: MirageType
  intensity: number    // 0-100 visibility
  lureRadius: number   // how far it attracts
  duration: number
  startTick: number
}

const CHECK_INTERVAL = 1200
const MIRAGE_CHANCE = 0.005
const MAX_MIRAGES = 8
const FADE_RATE = 0.08
const LURE_STRENGTH = 0.3

const TYPES: MirageType[] = ['oasis', 'city', 'mountain', 'forest']

export class WorldMirageSystem {
  private mirages: Mirage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn mirages on sand tiles
    if (this.mirages.length < MAX_MIRAGES && Math.random() < MIRAGE_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND) {
        this.mirages.push({
          id: this.nextId++,
          x,
          y,
          type: TYPES[Math.floor(Math.random() * TYPES.length)],
          intensity: 60 + Math.random() * 40,
          lureRadius: 10 + Math.random() * 15,
          duration: 1500 + Math.random() * 2500,
          startTick: tick,
        })
      }
    }

    // Update mirages and lure creatures
    for (const mirage of this.mirages) {
      const elapsed = tick - mirage.startTick
      mirage.intensity -= FADE_RATE * CHECK_INTERVAL

      // Lure nearby creatures toward mirage
      if (mirage.intensity > 20) {
        const creatures = em.getEntitiesWithComponents('position')
        for (const eid of creatures) {
          const pos = em.getComponent<PositionComponent>(eid, 'position')
          if (!pos) continue

          const dx = mirage.x - pos.x
          const dy = mirage.y - pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < mirage.lureRadius && dist > 1) {
            // Gently pull creature toward mirage
            pos.x += (dx / dist) * LURE_STRENGTH
            pos.y += (dy / dist) * LURE_STRENGTH
          }
        }
      }
    }

    // Remove faded mirages
    this.mirages = this.mirages.filter(m => m.intensity > 5)
  }

  getMirages(): Mirage[] {
    return this.mirages
  }
}
