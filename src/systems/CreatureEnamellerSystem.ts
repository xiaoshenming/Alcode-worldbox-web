// Creature Enameller System (v3.584) - Enamel coating artisans
// Craftspeople who fuse glass powder onto metal surfaces for decoration

import { EntityManager } from '../ecs/Entity'

export interface Enameller {
  id: number
  entityId: number
  enamelSkill: number
  firingControl: number
  colorMixing: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2720
const RECRUIT_CHANCE = 0.0014
const MAX_ENAMELLERS = 10

export class CreatureEnamellerSystem {
  private enamellers: Enameller[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.enamellers.length < MAX_ENAMELLERS && Math.random() < RECRUIT_CHANCE) {
      this.enamellers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        enamelSkill: 10 + Math.random() * 25,
        firingControl: 15 + Math.random() * 20,
        colorMixing: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.enamellers) {
      e.enamelSkill = Math.min(100, e.enamelSkill + 0.02)
      e.firingControl = Math.min(100, e.firingControl + 0.015)
      e.outputQuality = Math.min(100, e.outputQuality + 0.01)
    }

    for (let _i = this.enamellers.length - 1; _i >= 0; _i--) { if (this.enamellers[_i].enamelSkill <= 4) this.enamellers.splice(_i, 1) }
  }

}
