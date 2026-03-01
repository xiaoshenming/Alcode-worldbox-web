// Creature Patternmaker System (v3.590) - Foundry pattern artisans
// Craftspeople who create wooden patterns for metal casting molds

import { EntityManager } from '../ecs/Entity'

export interface Patternmaker {
  id: number
  entityId: number
  patternSkill: number
  woodCarving: number
  dimensionAccuracy: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2740
const RECRUIT_CHANCE = 0.0014
const MAX_PATTERNMAKERS = 10

export class CreaturePatternmakerSystem {
  private patternmakers: Patternmaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.patternmakers.length < MAX_PATTERNMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.patternmakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        patternSkill: 10 + Math.random() * 25,
        woodCarving: 15 + Math.random() * 20,
        dimensionAccuracy: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.patternmakers) {
      p.patternSkill = Math.min(100, p.patternSkill + 0.02)
      p.woodCarving = Math.min(100, p.woodCarving + 0.015)
      p.outputQuality = Math.min(100, p.outputQuality + 0.01)
    }

    for (let _i = this.patternmakers.length - 1; _i >= 0; _i--) { if (this.patternmakers[_i].patternSkill <= 4) this.patternmakers.splice(_i, 1) }
  }

}
