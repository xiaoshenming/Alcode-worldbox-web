// Creature Piercer System (v3.738) - Metal piercing artisans
// Craftspeople who punch and pierce holes through metal sheets and plates

import { EntityManager } from '../ecs/Entity'

export interface Piercer {
  id: number
  entityId: number
  piercingSkill: number
  holePrecision: number
  plateHandling: number
  punchMaintenance: number
  tick: number
}

const CHECK_INTERVAL = 3215
const RECRUIT_CHANCE = 0.0016
const MAX_PIERCERS = 10

export class CreaturePiercerSystem {
  private piercers: Piercer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.piercers.length < MAX_PIERCERS && Math.random() < RECRUIT_CHANCE) {
      this.piercers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        piercingSkill: 10 + Math.random() * 25,
        holePrecision: 15 + Math.random() * 20,
        plateHandling: 5 + Math.random() * 20,
        punchMaintenance: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.piercers) {
      p.piercingSkill = Math.min(100, p.piercingSkill + 0.02)
      p.holePrecision = Math.min(100, p.holePrecision + 0.015)
      p.punchMaintenance = Math.min(100, p.punchMaintenance + 0.01)
    }

    for (let _i = this.piercers.length - 1; _i >= 0; _i--) { if (this.piercers[_i].piercingSkill <= 4) this.piercers.splice(_i, 1) }
  }

  getPiercers(): Piercer[] { return this.piercers }
}
