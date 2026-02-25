// World Stone Window System (v3.414) - Natural stone window formations
// Holes eroded through thin rock walls creating window-like openings

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface StoneWindow {
  id: number
  x: number
  y: number
  openingWidth: number
  openingHeight: number
  wallThickness: number
  frameSolidity: number
  lightEffect: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0013
const MAX_WINDOWS = 14

export class WorldStoneWindowSystem {
  private windows: StoneWindow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.windows.length < MAX_WINDOWS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.windows.push({
          id: this.nextId++,
          x, y,
          openingWidth: 2 + Math.random() * 10,
          openingHeight: 2 + Math.random() * 8,
          wallThickness: 1 + Math.random() * 5,
          frameSolidity: 40 + Math.random() * 40,
          lightEffect: 15 + Math.random() * 35,
          spectacle: 20 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const sw of this.windows) {
      sw.openingWidth = Math.min(15, sw.openingWidth + 0.000005)
      sw.wallThickness = Math.max(0.3, sw.wallThickness - 0.000006)
      sw.frameSolidity = Math.max(10, sw.frameSolidity - 0.00002)
      sw.spectacle = Math.max(8, Math.min(65, sw.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.windows.length - 1; i >= 0; i--) {
      if (this.windows[i].tick < cutoff) this.windows.splice(i, 1)
    }
  }

  getWindows(): StoneWindow[] { return this.windows }
}
