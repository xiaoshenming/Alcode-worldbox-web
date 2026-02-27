// Creature Countersinker System (v3.689) - Metal countersinking artisans
// Craftspeople who create conical recesses for flush-mounted fasteners

import { EntityManager } from '../ecs/Entity'

export interface Countersinker {
  id: number
  entityId: number
  countersinkingSkill: number
  angleControl: number
  depthPrecision: number
  flushAlignment: number
  tick: number
}

const CHECK_INTERVAL = 2990
const RECRUIT_CHANCE = 0.0015
const MAX_COUNTERSINKERS = 10

export class CreatureCountersinkerSystem {
  private countersinkers: Countersinker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.countersinkers.length < MAX_COUNTERSINKERS && Math.random() < RECRUIT_CHANCE) {
      this.countersinkers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        countersinkingSkill: 10 + Math.random() * 25,
        angleControl: 15 + Math.random() * 20,
        depthPrecision: 5 + Math.random() * 20,
        flushAlignment: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.countersinkers) {
      c.countersinkingSkill = Math.min(100, c.countersinkingSkill + 0.02)
      c.angleControl = Math.min(100, c.angleControl + 0.015)
      c.flushAlignment = Math.min(100, c.flushAlignment + 0.01)
    }

    for (let _i = this.countersinkers.length - 1; _i >= 0; _i--) { if (this.countersinkers[_i].countersinkingSkill <= 4) this.countersinkers.splice(_i, 1) }
  }

  getCountersinkers(): Countersinker[] { return this.countersinkers }
}
