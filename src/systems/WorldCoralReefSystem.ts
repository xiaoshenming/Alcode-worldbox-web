// World Coral Reef System (v3.57) - Coral reefs grow in shallow warm waters
// Reefs boost marine biodiversity, protect coastlines, and provide resources

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type CoralHealth = 'thriving' | 'healthy' | 'stressed' | 'bleached' | 'dead'

export interface CoralReef {
  id: number
  x: number
  y: number
  health: CoralHealth
  biodiversity: number
  size: number
  growthRate: number
  resourceYield: number
  startTick: number
}

const CHECK_INTERVAL = 1300
const GROW_CHANCE = 0.004
const MAX_REEFS = 12
const GROWTH_RATE = 0.03
const STRESS_THRESHOLD = 40

const HEALTH_ORDER: CoralHealth[] = ['thriving', 'healthy', 'stressed', 'bleached', 'dead']

const BIODIVERSITY_MAP: Record<CoralHealth, number> = {
  thriving: 90,
  healthy: 70,
  stressed: 40,
  bleached: 15,
  dead: 0,
}

export class WorldCoralReefSystem {
  private reefs: CoralReef[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn reefs in shallow water
    if (this.reefs.length < MAX_REEFS && Math.random() < GROW_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER) {
        this.reefs.push({
          id: this.nextId++,
          x, y,
          health: 'healthy',
          biodiversity: 50 + Math.random() * 30,
          size: 1 + Math.floor(Math.random() * 3),
          growthRate: GROWTH_RATE,
          resourceYield: 10 + Math.random() * 20,
          startTick: tick,
        })
      }
    }

    // Update existing reefs
    for (let i = this.reefs.length - 1; i >= 0; i--) {
      const r = this.reefs[i]

      r.size = Math.min(8, r.size + r.growthRate)
      r.biodiversity = Math.min(100, r.biodiversity + 0.02)
      r.resourceYield = r.biodiversity * 0.4

      const tile = world.getTile(r.x, r.y)
      if (tile !== TileType.SHALLOW_WATER && tile !== TileType.DEEP_WATER) {
        const hIdx = HEALTH_ORDER.indexOf(r.health)
        if (hIdx < HEALTH_ORDER.length - 1) {
          r.health = HEALTH_ORDER[hIdx + 1]
        }
      } else if (r.biodiversity > STRESS_THRESHOLD) {
        const hIdx = HEALTH_ORDER.indexOf(r.health)
        if (hIdx > 0) r.health = HEALTH_ORDER[hIdx - 1]
      }

      r.biodiversity = BIODIVERSITY_MAP[r.health] * (0.8 + Math.random() * 0.2)

      if (r.health === 'dead' && tick - r.startTick > 30000) {
        this.reefs.splice(i, 1)
      }
    }
  }

  getReefs(): readonly CoralReef[] { return this.reefs }
  getReefAt(x: number, y: number, radius: number): CoralReef | undefined {
    return this.reefs.find(r => Math.abs(r.x - x) <= radius && Math.abs(r.y - y) <= radius)
  }
}
