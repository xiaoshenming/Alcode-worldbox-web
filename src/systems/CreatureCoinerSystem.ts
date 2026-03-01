// Creature Coiner System (v3.698) - Metal coining artisans
// Craftspeople who strike coins and medallions using precision dies

import { EntityManager } from '../ecs/Entity'

export interface Coiner {
  id: number
  entityId: number
  coiningSkill: number
  dieStriking: number
  metalStamping: number
  reliefDepth: number
  tick: number
}

const CHECK_INTERVAL = 3020
const RECRUIT_CHANCE = 0.0015
const MAX_COINERS = 10

export class CreatureCoinerSystem {
  private coiners: Coiner[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.coiners.length < MAX_COINERS && Math.random() < RECRUIT_CHANCE) {
      this.coiners.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        coiningSkill: 10 + Math.random() * 25,
        dieStriking: 15 + Math.random() * 20,
        metalStamping: 5 + Math.random() * 20,
        reliefDepth: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.coiners) {
      c.coiningSkill = Math.min(100, c.coiningSkill + 0.02)
      c.dieStriking = Math.min(100, c.dieStriking + 0.015)
      c.reliefDepth = Math.min(100, c.reliefDepth + 0.01)
    }

    for (let _i = this.coiners.length - 1; _i >= 0; _i--) { if (this.coiners[_i].coiningSkill <= 4) this.coiners.splice(_i, 1) }
  }

}
