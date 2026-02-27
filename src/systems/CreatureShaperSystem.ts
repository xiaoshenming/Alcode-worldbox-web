// Creature Shaper System (v3.735) - Metal shaping artisans
// Craftspeople who form metal into desired shapes using hammers, presses and dies

import { EntityManager } from '../ecs/Entity'

export interface Shaper {
  id: number
  entityId: number
  shapingSkill: number
  dieAlignment: number
  formAccuracy: number
  pressureControl: number
  tick: number
}

const CHECK_INTERVAL = 3182
const RECRUIT_CHANCE = 0.0018
const MAX_SHAPERS = 13

export class CreatureShaperSystem {
  private shapers: Shaper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.shapers.length < MAX_SHAPERS && Math.random() < RECRUIT_CHANCE) {
      this.shapers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        shapingSkill: 13 + Math.random() * 23,
        dieAlignment: 16 + Math.random() * 19,
        formAccuracy: 8 + Math.random() * 17,
        pressureControl: 14 + Math.random() * 21,
        tick,
      })
    }

    for (const s of this.shapers) {
      s.shapingSkill = Math.min(100, s.shapingSkill + 0.023)
      s.dieAlignment = Math.min(100, s.dieAlignment + 0.017)
      s.pressureControl = Math.min(100, s.pressureControl + 0.013)
    }

    for (let _i = this.shapers.length - 1; _i >= 0; _i--) { if (this.shapers[_i].shapingSkill <= 4) this.shapers.splice(_i, 1) }
  }

  getShapers(): Shaper[] { return this.shapers }
}
