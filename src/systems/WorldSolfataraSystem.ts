// World Solfatara System (v3.459) - Solfatara volcanic formations
// Shallow volcanic craters emitting sulfurous gases and steam jets

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Solfatara {
  id: number
  x: number
  y: number
  sulfurOutput: number
  craterDiameter: number
  steamPressure: number
  toxicity: number
  tick: number
}

const CHECK_INTERVAL = 2680
const FORM_CHANCE = 0.0011
const MAX_SOLFATARAS = 9

export class WorldSolfataraSystem {
  private solfataras: Solfatara[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.solfataras.length < MAX_SOLFATARAS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.solfataras.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        sulfurOutput: 10 + Math.random() * 30,
        craterDiameter: 3 + Math.random() * 8,
        steamPressure: 15 + Math.random() * 35,
        toxicity: 5 + Math.random() * 20,
        tick,
      })
    }

    for (const s of this.solfataras) {
      s.sulfurOutput = Math.min(100, s.sulfurOutput + 0.01)
      s.steamPressure = 20 + 10 * Math.sin(tick * 0.001 + s.id)
      s.toxicity = Math.min(80, s.toxicity + 0.005)
    }

    for (let _i = this.solfataras.length - 1; _i >= 0; _i--) { if (!((s) => s.sulfurOutput < 100)(this.solfataras[_i])) this.solfataras.splice(_i, 1) }
  }

}
