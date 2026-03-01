// Creature Carding Makers System (v3.470) - Carding artisans
// Crafters preparing raw fibers by combing and aligning them for spinning

import { EntityManager } from '../ecs/Entity'

export interface CardingMaker {
  id: number
  entityId: number
  combingSkill: number
  fiberAlignment: number
  batchSize: number
  qualityGrade: number
  tick: number
}

const CHECK_INTERVAL = 2490
const RECRUIT_CHANCE = 0.0018
const MAX_MAKERS = 12

export class CreatureCardingMakersSystem {
  private makers: CardingMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        combingSkill: 10 + Math.random() * 25,
        fiberAlignment: 15 + Math.random() * 20,
        batchSize: 5 + Math.random() * 15,
        qualityGrade: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.combingSkill = Math.min(100, m.combingSkill + 0.02)
      m.fiberAlignment = Math.min(100, m.fiberAlignment + 0.015)
      m.qualityGrade = Math.min(100, m.qualityGrade + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].combingSkill <= 4) this.makers.splice(_i, 1) }
  }

}
