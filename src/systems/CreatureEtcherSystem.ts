// Creature Etcher System (v3.581) - Metal etching artisans
// Craftspeople who use acid and tools to create detailed designs on metal

import { EntityManager } from '../ecs/Entity'

export interface Etcher {
  id: number
  entityId: number
  etchingSkill: number
  acidControl: number
  designPrecision: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2710
const RECRUIT_CHANCE = 0.0014
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
        designPrecision: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.etchers) {
      e.etchingSkill = Math.min(100, e.etchingSkill + 0.02)
      e.acidControl = Math.min(100, e.acidControl + 0.015)
      e.outputQuality = Math.min(100, e.outputQuality + 0.01)
    }

    this.etchers = this.etchers.filter(e => e.etchingSkill > 4)
  }

  getEtchers(): Etcher[] { return this.etchers }
}
