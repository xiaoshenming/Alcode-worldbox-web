// World Sodium Spring System (v3.736) - Sodium-bearing mineral springs
// Springs carrying dissolved sodium compounds from halite and evaporite formations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SodiumSpringZone {
  id: number; x: number; y: number
  sodiumContent: number
  springFlow: number
  geologicalDeposit: number
  mineralConcentration: number
  tick: number
}

const CHECK_INTERVAL = 3240
const FORM_CHANCE = 0.0034
const MAX_ZONES = 36

export class WorldSodiumSpringSystem {
  private zones: SodiumSpringZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width, h = world.height

    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const nearWater = this.hasAdjacentTile(world, x, y, TileType.SHALLOW_WATER) || this.hasAdjacentTile(world, x, y, TileType.DEEP_WATER)
      const nearMountain = this.hasAdjacentTile(world, x, y, TileType.MOUNTAIN)
      if (!nearWater && !nearMountain) continue
      if (Math.random() > FORM_CHANCE) continue

      this.zones.push({
        id: this.nextId++, x, y,
        sodiumContent: 48 + Math.random() * 52,
        springFlow: 18 + Math.random() * 42,
        geologicalDeposit: 28 + Math.random() * 72,
        mineralConcentration: 22 + Math.random() * 78,
        tick
      })
    }

    const cutoff = tick - 58000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) this.zones.splice(i, 1)
    }
  }

  private hasAdjacentTile(world: World, x: number, y: number, tileType: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue
        if (world.getTile(x + dx, y + dy) === tileType) return true
      }
    }
    return false
  }

}
