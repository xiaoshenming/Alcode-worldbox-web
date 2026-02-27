// Creature Knitting Makers System (v3.446) - Knitting artisans
// Skilled crafters who produce knitted garments and textiles for their civilization

import { EntityManager } from '../ecs/Entity'

export interface KnittingMaker {
  id: number
  entityId: number
  skillLevel: number
  yarnQuality: number
  patternComplexity: number
  outputRate: number
  tick: number
}

const CHECK_INTERVAL = 2520
const RECRUIT_CHANCE = 0.0019
const MAX_MAKERS = 14

export class CreatureKnittingMakersSystem {
  private makers: KnittingMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        skillLevel: 10 + Math.random() * 30,
        yarnQuality: 15 + Math.random() * 25,
        patternComplexity: 5 + Math.random() * 20,
        outputRate: 0.3 + Math.random() * 0.4,
        tick,
      })
    }

    for (const m of this.makers) {
      m.skillLevel = Math.min(100, m.skillLevel + 0.02)
      m.yarnQuality = Math.min(100, m.yarnQuality + 0.01)
      m.outputRate = Math.min(1, m.outputRate + 0.005)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].skillLevel <= 5) this.makers.splice(_i, 1) }
  }

  getMakers(): KnittingMaker[] { return this.makers }
}
