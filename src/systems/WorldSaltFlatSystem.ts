// World Salt Flat System (v3.52) - Salt flats form in arid regions
// Salt flats provide salt resources and reflect light creating unique visuals

import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type SaltQuality = 'impure' | 'common' | 'refined' | 'pristine'

export interface SaltFlat {
  id: number
  x: number
  y: number
  quality: SaltQuality
  size: number         // 1-8
  saltReserve: number  // 0-100
  harvestRate: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 1300
const SPAWN_CHANCE = 0.004
const MAX_FLATS = 40
const RESERVE_REGEN = 0.01

const HARVEST_MAP: Record<SaltQuality, number> = {
  impure: 0.5,
  common: 1.0,
  refined: 2.0,
  pristine: 3.5,
}

export class WorldSaltFlatSystem {
  private flats: SaltFlat[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn salt flats on sand tiles
    if (this.flats.length < MAX_FLATS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND) {
        if (!this.flats.some(f => f.x === x && f.y === y)) {
          const quality: SaltQuality = Math.random() < 0.2 ? 'pristine' :
            Math.random() < 0.4 ? 'refined' :
            Math.random() < 0.7 ? 'common' : 'impure'

          this.flats.push({
            id: this.nextId++,
            x,
            y,
            quality,
            size: 1 + Math.floor(Math.random() * 3),
            saltReserve: 50 + Math.random() * 50,
            harvestRate: HARVEST_MAP[quality],
            age: 0,
            tick,
          })
        }
      }
    }

    // Update flats
    for (const flat of this.flats) {
      flat.age += CHECK_INTERVAL
      flat.saltReserve = Math.min(100, flat.saltReserve + RESERVE_REGEN * CHECK_INTERVAL)

      // Size grows slowly
      if (flat.age > 3000 && flat.size < 8) {
        flat.size += 0.01
      }
    }

    // Remove depleted flats
    this.flats = this.flats.filter(f => f.saltReserve > 1)
  }

  getFlats(): SaltFlat[] {
    return this.flats
  }

  getNearby(x: number, y: number, radius: number): SaltFlat[] {
    const r2 = radius * radius
    return this.flats.filter(f => {
      const dx = f.x - x
      const dy = f.y - y
      return dx * dx + dy * dy <= r2
    })
  }
}
