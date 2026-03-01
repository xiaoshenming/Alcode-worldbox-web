// World Arroyo System (v3.330) - Dry creek bed formations
// Ephemeral stream channels in arid regions that only flow during rain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Arroyo {
  id: number
  x: number
  y: number
  length: number
  depth: number
  waterPresence: number
  sedimentLoad: number
  flashFloodRisk: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2550
const FORM_CHANCE = 0.0016
const MAX_ARROYOS = 15

export class WorldArroyoSystem {
  private arroyos: Arroyo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arroyos.length < MAX_ARROYOS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.arroyos.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 40,
          depth: 2 + Math.random() * 10,
          waterPresence: Math.random() * 30,
          sedimentLoad: 10 + Math.random() * 35,
          flashFloodRisk: 15 + Math.random() * 45,
          spectacle: 10 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const a of this.arroyos) {
      a.waterPresence = Math.max(0, Math.min(80, a.waterPresence + (Math.random() - 0.52) * 0.3))
      a.depth = Math.min(20, a.depth + a.sedimentLoad * 0.00003)
      a.flashFloodRisk = Math.max(5, Math.min(80, a.flashFloodRisk + (Math.random() - 0.48) * 0.2))
      a.spectacle = Math.max(5, Math.min(60, a.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 86000
    for (let i = this.arroyos.length - 1; i >= 0; i--) {
      if (this.arroyos[i].tick < cutoff) this.arroyos.splice(i, 1)
    }
  }

}
