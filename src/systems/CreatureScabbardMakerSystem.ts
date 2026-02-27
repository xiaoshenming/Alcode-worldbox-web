// Creature Scabbard Maker System (v3.500) - Scabbard crafting artisans
// Skilled leatherworkers and woodworkers creating protective sword sheaths

import { EntityManager } from '../ecs/Entity'

export interface ScabbardMaker {
  id: number
  entityId: number
  leatherWorking: number
  woodCarving: number
  fittingPrecision: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2560
const RECRUIT_CHANCE = 0.0017
const MAX_MAKERS = 12

export class CreatureScabbardMakerSystem {
  private makers: ScabbardMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherWorking: 10 + Math.random() * 25,
        woodCarving: 15 + Math.random() * 20,
        fittingPrecision: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.leatherWorking = Math.min(100, m.leatherWorking + 0.02)
      m.fittingPrecision = Math.min(100, m.fittingPrecision + 0.015)
      m.outputQuality = Math.min(100, m.outputQuality + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].leatherWorking <= 4) this.makers.splice(_i, 1) }
  }

  getMakers(): ScabbardMaker[] { return this.makers }
}
