// Creature Swedger System (v3.713) - Metal swedging artisans
// Craftspeople who reduce rod diameter by forcing through tapered dies

import { EntityManager } from '../ecs/Entity'

export interface Swedger {
  id: number
  entityId: number
  swedgingSkill: number
  dieAlignment: number
  diameterReduction: number
  surfaceFinish: number
  tick: number
}

const CHECK_INTERVAL = 3070
const RECRUIT_CHANCE = 0.0015
const MAX_SWEDGERS = 10

export class CreatureSwedgerSystem {
  private swedgers: Swedger[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.swedgers.length < MAX_SWEDGERS && Math.random() < RECRUIT_CHANCE) {
      this.swedgers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        swedgingSkill: 10 + Math.random() * 25,
        dieAlignment: 15 + Math.random() * 20,
        diameterReduction: 5 + Math.random() * 20,
        surfaceFinish: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.swedgers) {
      s.swedgingSkill = Math.min(100, s.swedgingSkill + 0.02)
      s.dieAlignment = Math.min(100, s.dieAlignment + 0.015)
      s.surfaceFinish = Math.min(100, s.surfaceFinish + 0.01)
    }

    for (let _i = this.swedgers.length - 1; _i >= 0; _i--) { if (this.swedgers[_i].swedgingSkill <= 4) this.swedgers.splice(_i, 1) }
  }

  getSwedgers(): Swedger[] { return this.swedgers }
}
