// Creature Upsetter System (v3.710) - Metal upsetting artisans
// Craftspeople who thicken metal stock by compressing along its length

import { EntityManager } from '../ecs/Entity'

export interface Upsetter {
  id: number
  entityId: number
  upsettingSkill: number
  compressionForce: number
  stockThickening: number
  headForming: number
  tick: number
}

const CHECK_INTERVAL = 3060
const RECRUIT_CHANCE = 0.0015
const MAX_UPSETTERS = 10

export class CreatureUpsetterSystem {
  private upsetters: Upsetter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.upsetters.length < MAX_UPSETTERS && Math.random() < RECRUIT_CHANCE) {
      this.upsetters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        upsettingSkill: 10 + Math.random() * 25,
        compressionForce: 15 + Math.random() * 20,
        stockThickening: 5 + Math.random() * 20,
        headForming: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const u of this.upsetters) {
      u.upsettingSkill = Math.min(100, u.upsettingSkill + 0.02)
      u.compressionForce = Math.min(100, u.compressionForce + 0.015)
      u.headForming = Math.min(100, u.headForming + 0.01)
    }

    for (let _i = this.upsetters.length - 1; _i >= 0; _i--) { if (this.upsetters[_i].upsettingSkill <= 4) this.upsetters.splice(_i, 1) }
  }

}
