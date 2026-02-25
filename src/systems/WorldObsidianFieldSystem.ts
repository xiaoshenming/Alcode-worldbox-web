// World Obsidian Field System (v3.194) - Volcanic glass fields form near lava flows
// Obsidian is prized for tools and weapons, attracting miners and traders

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface ObsidianField {
  id: number
  x: number
  y: number
  deposit: number
  sharpness: number
  miningActivity: number
  tradeValue: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 1800
const SPAWN_CHANCE = 0.003
const MAX_FIELDS = 18

export class WorldObsidianFieldSystem {
  private fields: ObsidianField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form near volcanic/mountain terrain
      if (tile !== null && tile >= 6 && tile <= 7) {
        const deposit = 40 + Math.random() * 60
        this.fields.push({
          id: this.nextId++,
          x, y,
          deposit,
          sharpness: 70 + Math.random() * 30,
          miningActivity: 0,
          tradeValue: deposit * 1.5,
          age: 0,
          tick,
        })
      }
    }

    for (const f of this.fields) {
      f.age++
      f.miningActivity = Math.min(100, f.miningActivity + Math.random() * 0.5)
      f.deposit = Math.max(0, f.deposit - f.miningActivity * 0.01)
      f.tradeValue = f.deposit * 1.5 * (f.sharpness / 100)
      f.sharpness = Math.max(20, f.sharpness - 0.02)
    }

    for (let i = this.fields.length - 1; i >= 0; i--) {
      if (this.fields[i].deposit <= 0) {
        this.fields.splice(i, 1)
      }
    }
  }

  getFields(): readonly ObsidianField[] { return this.fields }
}
