// Creature Needlework Makers System (v3.461) - Needlework artisans
// Skilled crafters producing fine embroidery and decorative stitching

import { EntityManager } from '../ecs/Entity'

export interface NeedleworkMaker {
  id: number
  entityId: number
  stitchPrecision: number
  threadSelection: number
  designComplexity: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2540
const RECRUIT_CHANCE = 0.0018
const MAX_MAKERS = 13

export class CreatureNeedleworkMakersSystem {
  private makers: NeedleworkMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        stitchPrecision: 10 + Math.random() * 25,
        threadSelection: 15 + Math.random() * 20,
        designComplexity: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.stitchPrecision = Math.min(100, m.stitchPrecision + 0.02)
      m.designComplexity = Math.min(100, m.designComplexity + 0.015)
      m.outputQuality = Math.min(100, m.outputQuality + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].stitchPrecision <= 4) this.makers.splice(_i, 1) }
  }

}
