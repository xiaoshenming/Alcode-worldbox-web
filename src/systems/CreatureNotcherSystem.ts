// Creature Notcher System (v3.736) - Metal notching artisans
// Craftspeople who cut precise notches and indentations in metal for joints and fittings

import { EntityManager } from '../ecs/Entity'

export interface Notcher {
  id: number
  entityId: number
  notchingSkill: number
  cutDepth: number
  angleAccuracy: number
  bladeControl: number
  tick: number
}

const CHECK_INTERVAL = 3196
const RECRUIT_CHANCE = 0.0019
const MAX_NOTCHERS = 14

export class CreatureNotcherSystem {
  private notchers: Notcher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.notchers.length < MAX_NOTCHERS && Math.random() < RECRUIT_CHANCE) {
      this.notchers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        notchingSkill: 14 + Math.random() * 22,
        cutDepth: 18 + Math.random() * 18,
        angleAccuracy: 9 + Math.random() * 16,
        bladeControl: 15 + Math.random() * 20,
        tick,
      })
    }

    for (const n of this.notchers) {
      n.notchingSkill = Math.min(100, n.notchingSkill + 0.024)
      n.cutDepth = Math.min(100, n.cutDepth + 0.018)
      n.bladeControl = Math.min(100, n.bladeControl + 0.014)
    }

    for (let _i = this.notchers.length - 1; _i >= 0; _i--) { if (this.notchers[_i].notchingSkill <= 4) this.notchers.splice(_i, 1) }
  }

}
