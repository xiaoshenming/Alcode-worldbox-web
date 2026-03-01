// World Fumarolic Field System (v3.510) - Fumarolic field formations
// Areas of concentrated volcanic gas vents and steam emissions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface FumarolicField {
  id: number
  x: number
  y: number
  gasIntensity: number
  sulfurDeposit: number
  heatOutput: number
  ventCount: number
  tick: number
}

const CHECK_INTERVAL = 3050
const FORM_CHANCE = 0.0011
const MAX_FIELDS = 12

export class WorldFumarolicFieldSystem {
  private fields: FumarolicField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      this.fields.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        gasIntensity: 15 + Math.random() * 35,
        sulfurDeposit: 5 + Math.random() * 25,
        heatOutput: 20 + Math.random() * 40,
        ventCount: 3 + Math.floor(Math.random() * 12),
        tick,
      })
    }

    for (const f of this.fields) {
      f.gasIntensity = Math.max(5, Math.min(80, f.gasIntensity + (Math.random() - 0.48) * 0.25))
      f.heatOutput = Math.max(10, Math.min(85, f.heatOutput + (Math.random() - 0.5) * 0.2))
      f.sulfurDeposit = Math.min(70, f.sulfurDeposit + 0.008)
    }

    const cutoff = tick - 82000
    for (let i = this.fields.length - 1; i >= 0; i--) {
      if (this.fields[i].tick < cutoff) this.fields.splice(i, 1)
    }
  }

}
