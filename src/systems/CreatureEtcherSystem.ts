// Creature Etcher System (v3.745) - Metal etching artisans
// Craftspeople who use acid or chemical processes to create designs on metal

import { EntityManager } from '../ecs/Entity'

export interface Etcher {
  id: number
  entityId: number
  etchingSkill: number
  acidControl: number
  maskPrecision: number
  surfaceFinish: number
  tick: number
}

const CHECK_INTERVAL = 3312
const RECRUIT_CHANCE = 0.0015
const MAX_ETCHERS = 10

export class CreatureEtcherSystem {
  private etchers: Etcher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.etchers.length < MAX_ETCHERS && Math.random() < RECRUIT_CHANCE) {
      this.etchers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        etchingSkill: 10 + Math.random() * 25,
        acidControl: 15 + Math.random() * 20,
        maskPrecision: 5 + Math.random() * 20,
        surfaceFinish: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.etchers) {
      e.etchingSkill = Math.min(100, e.etchingSkill + 0.02)
      e.acidControl = Math.min(100, e.acidControl + 0.015)
      e.surfaceFinish = Math.min(100, e.surfaceFinish + 0.01)
    }

    for (let _i = this.etchers.length - 1; _i >= 0; _i--) { if (this.etchers[_i].etchingSkill <= 4) this.etchers.splice(_i, 1) }
  }

}
