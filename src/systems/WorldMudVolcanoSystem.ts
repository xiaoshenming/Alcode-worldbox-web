// World Mud Volcano System (v3.447) - Mud volcano formations
// Eruptions of mud, water, and gases from underground creating unique terrain features

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface MudVolcano {
  id: number
  x: number
  y: number
  eruptionForce: number
  mudDepth: number
  gasEmission: number
  dormancy: number
  tick: number
}

const CHECK_INTERVAL = 2650
const FORM_CHANCE = 0.0013
const MAX_VOLCANOS = 10

export class WorldMudVolcanoSystem {
  private volcanos: MudVolcano[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.volcanos.length < MAX_VOLCANOS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.volcanos.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        eruptionForce: 10 + Math.random() * 40,
        mudDepth: 20 + Math.random() * 30,
        gasEmission: 5 + Math.random() * 25,
        dormancy: 0,
        tick,
      })
    }

    for (const v of this.volcanos) {
      v.eruptionForce = Math.max(0, v.eruptionForce - 0.03)
      v.dormancy += 0.01
      if (v.eruptionForce > 20 && Math.random() < 0.05) {
        v.mudDepth = Math.min(100, v.mudDepth + 2)
      }
    }

    this.volcanos = this.volcanos.filter(v => v.dormancy < 100)
  }

  getVolcanos(): MudVolcano[] { return this.volcanos }
}
