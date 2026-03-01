// World Kettle Hole System (v3.321) - Glacial kettle hole formations
// Depressions formed by retreating glaciers leaving buried ice blocks that melt

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface KettleHole {
  id: number
  x: number
  y: number
  diameter: number
  depth: number
  waterFilled: boolean
  sedimentLayer: number
  vegetationRing: number
  wildlifeValue: number
  tick: number
}

const CHECK_INTERVAL = 2650
const FORM_CHANCE = 0.0016
const MAX_KETTLES = 14

export class WorldKettleHoleSystem {
  private kettles: KettleHole[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.kettles.length < MAX_KETTLES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.SNOW) {
        this.kettles.push({
          id: this.nextId++,
          x, y,
          diameter: 5 + Math.floor(Math.random() * 15),
          depth: 3 + Math.random() * 20,
          waterFilled: Math.random() > 0.35,
          sedimentLayer: 5 + Math.random() * 25,
          vegetationRing: 10 + Math.random() * 40,
          wildlifeValue: 15 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const kettle of this.kettles) {
      kettle.sedimentLayer = Math.min(50, kettle.sedimentLayer + 0.003)
      kettle.vegetationRing = Math.max(5, Math.min(70, kettle.vegetationRing + (Math.random() - 0.45) * 0.12))
      kettle.wildlifeValue = Math.max(5, Math.min(65, kettle.wildlifeValue + (Math.random() - 0.46) * 0.1))
    }

    const cutoff = tick - 93000
    for (let i = this.kettles.length - 1; i >= 0; i--) {
      if (this.kettles[i].tick < cutoff) this.kettles.splice(i, 1)
    }
  }

}
