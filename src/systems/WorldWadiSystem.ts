// World Wadi System (v3.342) - Dry valley formations
// Valleys in arid regions that become watercourses during heavy rain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Wadi {
  id: number
  x: number
  y: number
  length: number
  depth: number
  waterFrequency: number
  sedimentType: number
  flashFloodRisk: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0015
const MAX_WADIS = 15

export class WorldWadiSystem {
  private wadis: Wadi[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.wadis.length < MAX_WADIS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.wadis.push({
          id: this.nextId++,
          x, y,
          length: 20 + Math.random() * 45,
          depth: 3 + Math.random() * 12,
          waterFrequency: 5 + Math.random() * 25,
          sedimentType: Math.floor(Math.random() * 4),
          flashFloodRisk: 15 + Math.random() * 40,
          spectacle: 12 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const w of this.wadis) {
      w.waterFrequency = Math.max(2, Math.min(60, w.waterFrequency + (Math.random() - 0.52) * 0.22))
      w.depth = Math.min(25, w.depth + 0.00003)
      w.flashFloodRisk = Math.max(5, Math.min(75, w.flashFloodRisk + (Math.random() - 0.48) * 0.18))
      w.spectacle = Math.max(5, Math.min(60, w.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 87000
    for (let i = this.wadis.length - 1; i >= 0; i--) {
      if (this.wadis[i].tick < cutoff) this.wadis.splice(i, 1)
    }
  }

  getWadis(): Wadi[] { return this.wadis }
}
