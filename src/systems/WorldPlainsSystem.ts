// World Plains System (v3.297) - Vast open grassland plains
// Expansive flat terrain with tall grasses and seasonal weather patterns

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Plains {
  id: number
  x: number
  y: number
  radius: number
  grassHeight: number
  soilFertility: number
  windExposure: number
  wildlifeAbundance: number
  moisture: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.002
const MAX_PLAINS = 18

export class WorldPlainsSystem {
  private plains: Plains[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.plains.length < MAX_PLAINS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS) {
        this.plains.push({
          id: this.nextId++,
          x, y,
          radius: 8 + Math.floor(Math.random() * 8),
          grassHeight: 20 + Math.random() * 40,
          soilFertility: 40 + Math.random() * 35,
          windExposure: 30 + Math.random() * 40,
          wildlifeAbundance: 20 + Math.random() * 40,
          moisture: 25 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const plain of this.plains) {
      plain.grassHeight = Math.max(10, Math.min(80, plain.grassHeight + (Math.random() - 0.48) * 0.2))
      plain.soilFertility = Math.min(90, plain.soilFertility + 0.005)
      plain.wildlifeAbundance = Math.min(80, plain.wildlifeAbundance + 0.008)
      plain.moisture = Math.max(10, Math.min(60, plain.moisture + (Math.random() - 0.5) * 0.25))
    }

    const cutoff = tick - 90000
    for (let i = this.plains.length - 1; i >= 0; i--) {
      if (this.plains[i].tick < cutoff) this.plains.splice(i, 1)
    }
  }

  getPlains(): Plains[] { return this.plains }
}
