// Creature Saddler System (v3.521) - Saddle crafting artisans
// Skilled workers creating saddles for riding animals

import { EntityManager } from '../ecs/Entity'

export interface Saddler {
  id: number
  entityId: number
  leatherShaping: number
  treeFitting: number
  paddingWork: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2630
const RECRUIT_CHANCE = 0.0014
const MAX_SADDLERS = 10

export class CreatureSaddlerSystem {
  private saddlers: Saddler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.saddlers.length < MAX_SADDLERS && Math.random() < RECRUIT_CHANCE) {
      this.saddlers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherShaping: 10 + Math.random() * 25,
        treeFitting: 15 + Math.random() * 20,
        paddingWork: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.saddlers) {
      s.leatherShaping = Math.min(100, s.leatherShaping + 0.02)
      s.paddingWork = Math.min(100, s.paddingWork + 0.015)
      s.outputQuality = Math.min(100, s.outputQuality + 0.01)
    }

    for (let _i = this.saddlers.length - 1; _i >= 0; _i--) { if (this.saddlers[_i].leatherShaping <= 4) this.saddlers.splice(_i, 1) }
  }

  getSaddlers(): Saddler[] { return this.saddlers }
}
