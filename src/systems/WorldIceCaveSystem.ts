// World Ice Cave System (v3.219) - Glacial ice cave formations
// Ancient frozen caverns harbor crystalline wonders beneath snow-capped peaks

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface IceCaveZone {
  id: number
  x: number
  y: number
  temperature: number
  iceThickness: number
  crystalFormation: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.003
const MAX_ZONES = 30

export class WorldIceCaveSystem {
  private zones: IceCaveZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break

      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Cold tiles: snow or mountain
      if (tile !== TileType.SNOW && tile !== TileType.MOUNTAIN) continue
      if (Math.random() > FORM_CHANCE) continue

      this.zones.push({
        id: this.nextId++,
        x,
        y,
        temperature: -40 + Math.random() * 20,
        iceThickness: 30 + Math.random() * 70,
        crystalFormation: 10 + Math.random() * 50,
        stability: 40 + Math.random() * 40,
        tick,
      })
    }

    const cutoff = tick - 58000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) this.zones.splice(i, 1)
    }
  }

}
