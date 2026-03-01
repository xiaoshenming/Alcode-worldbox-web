// Creature Potter System (v3.485) - Pottery artisans
// Skilled crafters shaping clay into vessels and decorative items

import { EntityManager } from '../ecs/Entity'

export interface Potter {
  id: number
  entityId: number
  wheelControl: number
  clayPreparation: number
  glazingSkill: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2550
const RECRUIT_CHANCE = 0.0018
const MAX_POTTERS = 13

export class CreaturePotterSystem {
  private potters: Potter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.potters.length < MAX_POTTERS && Math.random() < RECRUIT_CHANCE) {
      this.potters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        wheelControl: 10 + Math.random() * 25,
        clayPreparation: 15 + Math.random() * 20,
        glazingSkill: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.potters) {
      p.wheelControl = Math.min(100, p.wheelControl + 0.02)
      p.glazingSkill = Math.min(100, p.glazingSkill + 0.015)
      p.outputQuality = Math.min(100, p.outputQuality + 0.01)
    }

    for (let _i = this.potters.length - 1; _i >= 0; _i--) { if (this.potters[_i].wheelControl <= 4) this.potters.splice(_i, 1) }
  }

}
