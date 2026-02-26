// World Carbon Spring System (v3.740) - Carbon-bearing mineral springs
// Springs carrying dissolved carbon compounds from limestone and coal seams

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface CarbonSpringZone {
  id: number; x: number; y: number
  carbonContent: number
  springFlow: number
  limestoneLeaching: number
  carbonateConcentration: number
  tick: number
}

const CHECK_INTERVAL = 3285
const FORM_CHANCE = 0.003
const MAX_ZONES = 32

export class WorldCarbonSpringSystem {
  private zones: CarbonSpringZone[] = []
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
        carbonContent: 40 + Math.random() * 60,
        springFlow: 10 + Math.random() * 50,
        limestoneLeaching: 20 + Math.random() * 80,
        carbonateConcentration: 15 + Math.random() * 85,
        tick
      })
    }

    const cutoff = tick - 54000
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

  getZones(): readonly CarbonSpringZone[] { return this.zones }
}
