// Creature Diemaker System (v3.593) - Die and mold artisans
// Craftspeople who create precision dies for stamping and forming metal

import { EntityManager } from '../ecs/Entity'

export interface Diemaker {
  id: number
  entityId: number
  diemakingSkill: number
  precisionCutting: number
  hardeningControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2750
const RECRUIT_CHANCE = 0.0014
const MAX_DIEMAKERS = 10

export class CreatureDiemakerSystem {
  private diemakers: Diemaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.diemakers.length < MAX_DIEMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.diemakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        diemakingSkill: 10 + Math.random() * 25,
        precisionCutting: 15 + Math.random() * 20,
        hardeningControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const d of this.diemakers) {
      d.diemakingSkill = Math.min(100, d.diemakingSkill + 0.02)
      d.precisionCutting = Math.min(100, d.precisionCutting + 0.015)
      d.outputQuality = Math.min(100, d.outputQuality + 0.01)
    }

    for (let _i = this.diemakers.length - 1; _i >= 0; _i--) { if (this.diemakers[_i].diemakingSkill <= 4) this.diemakers.splice(_i, 1) }
  }

}
