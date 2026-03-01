// Creature Locksmith System (v3.542) - Lock and key crafting artisans
// Skilled metalworkers creating locks, keys, and security mechanisms

import { EntityManager } from '../ecs/Entity'

export interface Locksmith {
  id: number
  entityId: number
  precisionWork: number
  mechanismDesign: number
  keyFitting: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2600
const RECRUIT_CHANCE = 0.0014
const MAX_LOCKSMITHS = 10

export class CreatureLocksmithSystem {
  private locksmiths: Locksmith[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.locksmiths.length < MAX_LOCKSMITHS && Math.random() < RECRUIT_CHANCE) {
      this.locksmiths.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        precisionWork: 10 + Math.random() * 25,
        mechanismDesign: 15 + Math.random() * 20,
        keyFitting: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const l of this.locksmiths) {
      l.precisionWork = Math.min(100, l.precisionWork + 0.02)
      l.keyFitting = Math.min(100, l.keyFitting + 0.015)
      l.outputQuality = Math.min(100, l.outputQuality + 0.01)
    }

    for (let _i = this.locksmiths.length - 1; _i >= 0; _i--) { if (this.locksmiths[_i].precisionWork <= 4) this.locksmiths.splice(_i, 1) }
  }

}
