// Creature Quencher System (v3.608) - Metal quenching artisans
// Craftspeople who rapidly cool heated metal in liquid to harden it

import { EntityManager } from '../ecs/Entity'

export interface Quencher {
  id: number
  entityId: number
  quenchingSkill: number
  mediumSelection: number
  timingControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2800
const RECRUIT_CHANCE = 0.0014
const MAX_QUENCHERS = 10

export class CreatureQuencherSystem {
  private quenchers: Quencher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.quenchers.length < MAX_QUENCHERS && Math.random() < RECRUIT_CHANCE) {
      this.quenchers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        quenchingSkill: 10 + Math.random() * 25,
        mediumSelection: 15 + Math.random() * 20,
        timingControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const q of this.quenchers) {
      q.quenchingSkill = Math.min(100, q.quenchingSkill + 0.02)
      q.mediumSelection = Math.min(100, q.mediumSelection + 0.015)
      q.outputQuality = Math.min(100, q.outputQuality + 0.01)
    }

    for (let _i = this.quenchers.length - 1; _i >= 0; _i--) { if (this.quenchers[_i].quenchingSkill <= 4) this.quenchers.splice(_i, 1) }
  }

}
