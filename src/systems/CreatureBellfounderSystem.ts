// Creature Bellfounder System (v3.548) - Bell casting artisans
// Master casters who create bells for temples, towers, and ceremonies

import { EntityManager } from '../ecs/Entity'

export interface Bellfounder {
  id: number
  entityId: number
  bronzeCasting: number
  moldMaking: number
  toneTuning: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2660
const RECRUIT_CHANCE = 0.0014
const MAX_BELLFOUNDERS = 10

export class CreatureBellfounderSystem {
  private bellfounders: Bellfounder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bellfounders.length < MAX_BELLFOUNDERS && Math.random() < RECRUIT_CHANCE) {
      this.bellfounders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        bronzeCasting: 10 + Math.random() * 25,
        moldMaking: 15 + Math.random() * 20,
        toneTuning: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.bellfounders) {
      b.bronzeCasting = Math.min(100, b.bronzeCasting + 0.02)
      b.toneTuning = Math.min(100, b.toneTuning + 0.015)
      b.outputQuality = Math.min(100, b.outputQuality + 0.01)
    }

    for (let _i = this.bellfounders.length - 1; _i >= 0; _i--) { if (this.bellfounders[_i].bronzeCasting <= 4) this.bellfounders.splice(_i, 1) }
  }

  getBellfounders(): Bellfounder[] { return this.bellfounders }
}
