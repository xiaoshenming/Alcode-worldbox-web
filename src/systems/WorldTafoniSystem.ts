// World Tafoni System (v3.396) - Tafoni honeycomb weathering formations
// Cavernous weathering patterns creating honeycomb-like holes in rock surfaces

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Tafoni {
  id: number
  x: number
  y: number
  cavityCount: number
  cavityDepth: number
  saltContent: number
  weatheringRate: number
  rockType: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0014
const MAX_TAFONI = 16

export class WorldTafoniSystem {
  private tafoni: Tafoni[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tafoni.length < MAX_TAFONI && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.tafoni.push({
          id: this.nextId++,
          x, y,
          cavityCount: 5 + Math.floor(Math.random() * 30),
          cavityDepth: 2 + Math.random() * 15,
          saltContent: 10 + Math.random() * 40,
          weatheringRate: 5 + Math.random() * 20,
          rockType: Math.floor(Math.random() * 4),
          spectacle: 10 + Math.random() * 28,
          tick,
        })
      }
    }

    for (const t of this.tafoni) {
      t.cavityCount = Math.min(60, t.cavityCount + (Math.random() < 0.0008 ? 1 : 0))
      t.cavityDepth = Math.min(30, t.cavityDepth + 0.00003)
      t.weatheringRate = Math.max(2, Math.min(35, t.weatheringRate + (Math.random() - 0.5) * 0.07))
      t.spectacle = Math.max(5, Math.min(55, t.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 91000
    for (let i = this.tafoni.length - 1; i >= 0; i--) {
      if (this.tafoni[i].tick < cutoff) this.tafoni.splice(i, 1)
    }
  }

}
