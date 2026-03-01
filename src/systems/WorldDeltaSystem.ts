// World Delta System (v3.336) - River delta formations
// Fan-shaped landforms created where rivers deposit sediment at their mouths

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Delta {
  id: number
  x: number
  y: number
  area: number
  channelCount: number
  sedimentDeposit: number
  fertility: number
  floodRisk: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2620
const FORM_CHANCE = 0.0014
const MAX_DELTAS = 15

export class WorldDeltaSystem {
  private deltas: Delta[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.deltas.length < MAX_DELTAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.SHALLOW_WATER) {
        this.deltas.push({
          id: this.nextId++,
          x, y,
          area: 20 + Math.random() * 50,
          channelCount: 2 + Math.floor(Math.random() * 6),
          sedimentDeposit: 15 + Math.random() * 40,
          fertility: 30 + Math.random() * 50,
          floodRisk: 10 + Math.random() * 35,
          spectacle: 18 + Math.random() * 42,
          tick,
        })
      }
    }

    for (const d of this.deltas) {
      d.sedimentDeposit = Math.max(5, Math.min(80, d.sedimentDeposit + (Math.random() - 0.48) * 0.16))
      d.fertility = Math.max(15, Math.min(90, d.fertility + (Math.random() - 0.47) * 0.12))
      d.area = Math.min(80, d.area + d.sedimentDeposit * 0.00004)
      d.spectacle = Math.max(10, Math.min(70, d.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 92000
    for (let i = this.deltas.length - 1; i >= 0; i--) {
      if (this.deltas[i].tick < cutoff) this.deltas.splice(i, 1)
    }
  }

}
