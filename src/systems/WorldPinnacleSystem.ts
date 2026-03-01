// World Pinnacle System (v3.304) - Pointed rock pinnacle formations
// Tall pointed rock formations rising sharply from surrounding terrain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Pinnacle {
  id: number
  x: number
  y: number
  height: number
  sharpness: number
  stability: number
  weathering: number
  mineralContent: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0017
const MAX_PINNACLES = 16

export class WorldPinnacleSystem {
  private pinnacles: Pinnacle[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pinnacles.length < MAX_PINNACLES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.pinnacles.push({
          id: this.nextId++,
          x, y,
          height: 25 + Math.random() * 60,
          sharpness: 40 + Math.random() * 50,
          stability: 50 + Math.random() * 35,
          weathering: 5 + Math.random() * 15,
          mineralContent: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const pin of this.pinnacles) {
      pin.weathering = Math.max(2, Math.min(25, pin.weathering + (Math.random() - 0.48) * 0.08))
      pin.height = Math.max(10, pin.height - pin.weathering * 0.0002)
      pin.sharpness = Math.max(15, pin.sharpness - 0.003)
      pin.stability = Math.max(15, pin.stability - pin.weathering * 0.0001)
    }

    const cutoff = tick - 93000
    for (let i = this.pinnacles.length - 1; i >= 0; i--) {
      if (this.pinnacles[i].tick < cutoff) this.pinnacles.splice(i, 1)
    }
  }

}
