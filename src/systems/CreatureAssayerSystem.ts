// Creature Assayer System (v3.617) - Metal assaying specialists
// Experts who test and determine the purity and composition of metals

import { EntityManager } from '../ecs/Entity'

export interface Assayer {
  id: number
  entityId: number
  assayingSkill: number
  chemicalKnowledge: number
  precisionTesting: number
  purityAssessment: number
  tick: number
}

const CHECK_INTERVAL = 2790
const RECRUIT_CHANCE = 0.0014
const MAX_ASSAYERS = 10

export class CreatureAssayerSystem {
  private assayers: Assayer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.assayers.length < MAX_ASSAYERS && Math.random() < RECRUIT_CHANCE) {
      this.assayers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        assayingSkill: 10 + Math.random() * 25,
        chemicalKnowledge: 15 + Math.random() * 20,
        precisionTesting: 5 + Math.random() * 20,
        purityAssessment: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const a of this.assayers) {
      a.assayingSkill = Math.min(100, a.assayingSkill + 0.02)
      a.chemicalKnowledge = Math.min(100, a.chemicalKnowledge + 0.015)
      a.purityAssessment = Math.min(100, a.purityAssessment + 0.01)
    }

    for (let _i = this.assayers.length - 1; _i >= 0; _i--) { if (this.assayers[_i].assayingSkill <= 4) this.assayers.splice(_i, 1) }
  }

  getAssayers(): Assayer[] { return this.assayers }
}
