// World Tide Pool System (v3.01) - Tide pools form along coastlines
// Small ecosystems with unique creatures and resources appear at low tide

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface TidePool {
  id: number
  x: number
  y: number
  size: number
  biodiversity: number  // 0-100
  resources: number
  age: number
  active: boolean
}

const CHECK_INTERVAL = 1000
const MAX_POOLS = 20
const FORM_CHANCE = 0.012
const MIN_COAST_TILES = 3

export class WorldTidePoolSystem {
  private pools: TidePool[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formPools(world)
    this.evolvePools()
    this.cleanup()
  }

  private formPools(world: World): void {
    if (this.pools.length >= MAX_POOLS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 15; attempt++) {
      const x = 2 + Math.floor(Math.random() * (w - 4))
      const y = 2 + Math.floor(Math.random() * (h - 4))

      const tile = world.getTile(x, y)
      if (tile !== TileType.SAND && tile !== TileType.SHALLOW_WATER) continue

      let coastCount = 0
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER) coastCount++
        }
      }
      if (coastCount < MIN_COAST_TILES) continue

      this.pools.push({
        id: this.nextId++,
        x, y,
        size: 1 + Math.floor(Math.random() * 3),
        biodiversity: 20 + Math.random() * 60,
        resources: 10 + Math.random() * 40,
        age: 0,
        active: true,
      })
      break
    }
  }

  private evolvePools(): void {
    for (const pool of this.pools) {
      pool.age++
      // Biodiversity grows slowly
      pool.biodiversity = Math.min(100, pool.biodiversity + Math.random() * 0.5)
      // Resources regenerate
      pool.resources = Math.min(50, pool.resources + Math.random() * 0.3)
    }
  }

  private cleanup(): void {
    if (this.pools.length > MAX_POOLS) {
      this.pools.sort((a, b) => b.biodiversity - a.biodiversity)
      this.pools.length = MAX_POOLS
    }
  }

  private _activePoolsBuf: TidePool[] = []
  getActivePools(): TidePool[] {
    this._activePoolsBuf.length = 0
    for (const p of this.pools) { if (p.active) this._activePoolsBuf.push(p) }
    return this._activePoolsBuf
  }
}
