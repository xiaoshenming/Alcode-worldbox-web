// Creature Temper System (v3.605) - Metal tempering artisans
// Craftspeople who reheat and cool metal to achieve desired hardness and toughness

import { EntityManager } from '../ecs/Entity'

export interface Temper {
  id: number
  entityId: number
  temperingSkill: number
  heatControl: number
  hardnessJudgment: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2790
const RECRUIT_CHANCE = 0.0014
const MAX_TEMPERS = 10

export class CreatureTemperSystem {
  private tempers: Temper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tempers.length < MAX_TEMPERS && Math.random() < RECRUIT_CHANCE) {
      this.tempers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        temperingSkill: 10 + Math.random() * 25,
        heatControl: 15 + Math.random() * 20,
        hardnessJudgment: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.tempers) {
      t.temperingSkill = Math.min(100, t.temperingSkill + 0.02)
      t.heatControl = Math.min(100, t.heatControl + 0.015)
      t.outputQuality = Math.min(100, t.outputQuality + 0.01)
    }

    for (let _i = this.tempers.length - 1; _i >= 0; _i--) { if (this.tempers[_i].temperingSkill <= 4) this.tempers.splice(_i, 1) }
  }

}
