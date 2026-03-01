// World Rock Pillar System (v3.417) - Natural rock pillar formations
// Tall narrow columns of rock formed by erosion of surrounding softer material

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RockPillar {
  id: number
  x: number
  y: number
  height: number
  diameter: number
  stability: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0013
const MAX_PILLARS = 14

export class WorldRockPillarSystem {
  private pillars: RockPillar[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pillars.length < MAX_PILLARS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.pillars.push({
          id: this.nextId++,
          x, y,
          height: 8 + Math.random() * 25,
          diameter: 2 + Math.random() * 6,
          stability: 50 + Math.random() * 35,
          erosionRate: 0.001 + Math.random() * 0.003,
          spectacle: 20 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const p of this.pillars) {
      p.height = Math.max(2, p.height - p.erosionRate)
      p.stability = Math.max(10, p.stability - 0.00003)
      p.spectacle = Math.max(8, Math.min(70, p.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 92000
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      if (this.pillars[i].tick < cutoff) this.pillars.splice(i, 1)
    }
  }

}
