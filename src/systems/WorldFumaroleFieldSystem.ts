// World Fumarole Field System (v3.480) - Fumarole field formations
// Concentrated areas of volcanic gas vents and steam emissions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface FumaroleField {
  id: number
  x: number
  y: number
  ventCount: number
  gasEmission: number
  sulfurDeposit: number
  heatIntensity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2720
const FORM_CHANCE = 0.0008
const MAX_FIELDS = 6

export class WorldFumaroleFieldSystem {
  private fields: FumaroleField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.fields.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        ventCount: 3 + Math.floor(Math.random() * 12),
        gasEmission: 30 + Math.random() * 40,
        sulfurDeposit: 5 + Math.random() * 20,
        heatIntensity: 25 + Math.random() * 35,
        age: 0,
        tick,
      })
    }

    for (const f of this.fields) {
      f.age += 0.004
      f.gasEmission = Math.max(5, f.gasEmission - 0.008)
      f.sulfurDeposit = Math.min(90, f.sulfurDeposit + 0.012)
      f.heatIntensity = Math.max(10, f.heatIntensity - 0.005)
    }

    this.fields = this.fields.filter(f => f.age < 95)
  }

  getFields(): FumaroleField[] { return this.fields }
}
