// World Drumlin System (v3.318) - Glacial drumlin formations
// Elongated hills formed by glacial ice acting on underlying till

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Drumlin {
  id: number
  x: number
  y: number
  length: number
  width: number
  height: number
  orientation: number
  soilFertility: number
  glacialOrigin: number
  tick: number
}

const CHECK_INTERVAL = 2750
const FORM_CHANCE = 0.0017
const MAX_DRUMLINS = 16

export class WorldDrumlinSystem {
  private drumlins: Drumlin[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.drumlins.length < MAX_DRUMLINS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.SNOW) {
        this.drumlins.push({
          id: this.nextId++,
          x, y,
          length: 20 + Math.random() * 50,
          width: 8 + Math.random() * 20,
          height: 5 + Math.random() * 15,
          orientation: Math.random() * 360,
          soilFertility: 30 + Math.random() * 40,
          glacialOrigin: 200 + Math.random() * 800,
          tick,
        })
      }
    }

    for (const drumlin of this.drumlins) {
      drumlin.soilFertility = Math.max(10, Math.min(85, drumlin.soilFertility + (Math.random() - 0.45) * 0.1))
      drumlin.height = Math.max(2, drumlin.height - 0.0003)
      drumlin.glacialOrigin += 0.01
    }

    const cutoff = tick - 95000
    for (let i = this.drumlins.length - 1; i >= 0; i--) {
      if (this.drumlins[i].tick < cutoff) this.drumlins.splice(i, 1)
    }
  }

}
