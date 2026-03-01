// Creature Flatter System (v3.665) - Metal flatting artisans
// Craftspeople who flatten metal sheets using specialized rolling techniques

import { EntityManager } from '../ecs/Entity'

export interface Flatter {
  id: number
  entityId: number
  flattingSkill: number
  rollingPressure: number
  sheetUniformity: number
  thicknessControl: number
  tick: number
}

const CHECK_INTERVAL = 2910
const RECRUIT_CHANCE = 0.0015
const MAX_FLATTERS = 10

export class CreatureFlatterSystem {
  private flatters: Flatter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flatters.length < MAX_FLATTERS && Math.random() < RECRUIT_CHANCE) {
      this.flatters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        flattingSkill: 10 + Math.random() * 25,
        rollingPressure: 15 + Math.random() * 20,
        sheetUniformity: 5 + Math.random() * 20,
        thicknessControl: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.flatters) {
      f.flattingSkill = Math.min(100, f.flattingSkill + 0.02)
      f.rollingPressure = Math.min(100, f.rollingPressure + 0.015)
      f.thicknessControl = Math.min(100, f.thicknessControl + 0.01)
    }

    for (let _i = this.flatters.length - 1; _i >= 0; _i--) { if (this.flatters[_i].flattingSkill <= 4) this.flatters.splice(_i, 1) }
  }

}
