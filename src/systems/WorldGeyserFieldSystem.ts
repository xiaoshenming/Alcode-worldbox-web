// World Geyser Field System (v3.279) - Geothermal geyser clusters
// Areas with multiple geysers erupting hot water and steam at regular intervals

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface GeyserField {
  id: number
  x: number
  y: number
  radius: number
  geyserCount: number
  eruptionFrequency: number
  waterTemperature: number
  mineralDeposits: number
  steamOutput: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0018
const MAX_FIELDS = 14

export class WorldGeyserFieldSystem {
  private fields: GeyserField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.fields.push({
          id: this.nextId++,
          x, y,
          radius: 3 + Math.floor(Math.random() * 5),
          geyserCount: 2 + Math.floor(Math.random() * 6),
          eruptionFrequency: 10 + Math.random() * 40,
          waterTemperature: 80 + Math.random() * 20,
          mineralDeposits: 15 + Math.random() * 35,
          steamOutput: 20 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const field of this.fields) {
      field.eruptionFrequency = Math.max(5, Math.min(60, field.eruptionFrequency + (Math.random() - 0.5) * 0.3))
      field.waterTemperature = Math.max(60, Math.min(100, field.waterTemperature + (Math.random() - 0.5) * 0.2))
      field.mineralDeposits = Math.min(80, field.mineralDeposits + 0.006)
      field.steamOutput = Math.max(10, Math.min(80, field.steamOutput + (Math.random() - 0.5) * 0.25))
    }

    const cutoff = tick - 90000
    for (let i = this.fields.length - 1; i >= 0; i--) {
      if (this.fields[i].tick < cutoff) this.fields.splice(i, 1)
    }
  }

  getFields(): GeyserField[] { return this.fields }
}
