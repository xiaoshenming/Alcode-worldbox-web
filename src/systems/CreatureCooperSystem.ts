// Creature Cooper System (v3.491) - Barrel-making artisans
// Skilled crafters assembling wooden staves into barrels and casks

import { EntityManager } from '../ecs/Entity'

export interface Cooper {
  id: number
  entityId: number
  staveShaping: number
  hoopFitting: number
  sealingSkill: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2590
const RECRUIT_CHANCE = 0.0016
const MAX_COOPERS = 11

export class CreatureCooperSystem {
  private coopers: Cooper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.coopers.length < MAX_COOPERS && Math.random() < RECRUIT_CHANCE) {
      this.coopers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        staveShaping: 10 + Math.random() * 25,
        hoopFitting: 15 + Math.random() * 20,
        sealingSkill: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.coopers) {
      c.staveShaping = Math.min(100, c.staveShaping + 0.02)
      c.sealingSkill = Math.min(100, c.sealingSkill + 0.015)
      c.outputQuality = Math.min(100, c.outputQuality + 0.01)
    }

    for (let _i = this.coopers.length - 1; _i >= 0; _i--) { if (this.coopers[_i].staveShaping <= 4) this.coopers.splice(_i, 1) }
  }

  getCoopers(): Cooper[] { return this.coopers }
}
