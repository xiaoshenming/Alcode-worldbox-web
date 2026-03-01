// Creature Sawyer System (v3.566) - Timber sawing artisans
// Woodworkers who cut logs into planks and beams for construction

import { EntityManager } from '../ecs/Entity'

export interface Sawyer {
  id: number
  entityId: number
  sawingSkill: number
  timberGrading: number
  bladeControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2660
const RECRUIT_CHANCE = 0.0014
const MAX_SAWYERS = 10

export class CreatureSawyerSystem {
  private sawyers: Sawyer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.sawyers.length < MAX_SAWYERS && Math.random() < RECRUIT_CHANCE) {
      this.sawyers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        sawingSkill: 10 + Math.random() * 25,
        timberGrading: 15 + Math.random() * 20,
        bladeControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.sawyers) {
      s.sawingSkill = Math.min(100, s.sawingSkill + 0.02)
      s.bladeControl = Math.min(100, s.bladeControl + 0.015)
      s.outputQuality = Math.min(100, s.outputQuality + 0.01)
    }

    for (let _i = this.sawyers.length - 1; _i >= 0; _i--) { if (this.sawyers[_i].sawingSkill <= 4) this.sawyers.splice(_i, 1) }
  }

}
