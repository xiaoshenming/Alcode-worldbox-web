// Creature Felting Makers System 2 (v3.449) - Advanced felting artisans
// Master felters creating intricate needle-felted sculptures and durable felt goods

import { EntityManager } from '../ecs/Entity'

export interface FeltingMaker2 {
  id: number
  entityId: number
  needleSkill: number
  woolGrade: number
  densityControl: number
  artistry: number
  tick: number
}

const CHECK_INTERVAL = 2480
const RECRUIT_CHANCE = 0.0017
const MAX_MAKERS = 12

export class CreatureFeltingMakers2System {
  private makers: FeltingMaker2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        needleSkill: 10 + Math.random() * 25,
        woolGrade: 15 + Math.random() * 30,
        densityControl: 10 + Math.random() * 20,
        artistry: 5 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.needleSkill = Math.min(100, m.needleSkill + 0.02)
      m.artistry = Math.min(100, m.artistry + 0.015)
      m.densityControl = Math.min(100, m.densityControl + 0.01)
    }

    this.makers = this.makers.filter(m => m.needleSkill > 3)
  }

  getMakers(): FeltingMaker2[] { return this.makers }
}
