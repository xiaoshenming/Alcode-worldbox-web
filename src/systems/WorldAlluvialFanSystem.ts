// World Alluvial Fan System (v3.264) - Fan-shaped sediment deposits at mountain bases
// Where mountain streams emerge onto flatlands, depositing gravel, sand, and silt in spreading fans

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface AlluvialFan {
  id: number
  x: number
  y: number
  radius: number
  sedimentDepth: number
  channelCount: number
  fertility: number
  waterFlow: number
  gravelContent: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_FANS = 20

export class WorldAlluvialFanSystem {
  private fans: AlluvialFan[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fans.length < MAX_FANS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.fans.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 6),
          sedimentDepth: 3 + Math.random() * 15,
          channelCount: 2 + Math.floor(Math.random() * 6),
          fertility: 20 + Math.random() * 40,
          waterFlow: 10 + Math.random() * 30,
          gravelContent: 30 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const fan of this.fans) {
      fan.sedimentDepth = Math.min(35, fan.sedimentDepth + 0.003)
      fan.fertility = Math.min(80, fan.fertility + 0.01)
      fan.waterFlow = Math.max(3, Math.min(50, fan.waterFlow + (Math.random() - 0.5) * 0.4))
      fan.gravelContent = Math.max(10, fan.gravelContent - 0.002)
    }

    const cutoff = tick - 90000
    for (let i = this.fans.length - 1; i >= 0; i--) {
      if (this.fans[i].tick < cutoff) this.fans.splice(i, 1)
    }
  }

}
