// Creature Stamper System (v3.647) - Metal stamping artisans
// Workers who shape metal sheets using heavy stamping presses

import { EntityManager } from '../ecs/Entity'

export interface Stamper {
  id: number
  entityId: number
  stampingSkill: number
  pressAlignment: number
  dieSelection: number
  outputConsistency: number
  tick: number
}

const CHECK_INTERVAL = 2890
const RECRUIT_CHANCE = 0.0015
const MAX_STAMPERS = 10

export class CreatureStamperSystem {
  private stampers: Stamper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.stampers.length < MAX_STAMPERS && Math.random() < RECRUIT_CHANCE) {
      this.stampers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        stampingSkill: 10 + Math.random() * 25,
        pressAlignment: 15 + Math.random() * 20,
        dieSelection: 5 + Math.random() * 20,
        outputConsistency: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.stampers) {
      s.stampingSkill = Math.min(100, s.stampingSkill + 0.02)
      s.pressAlignment = Math.min(100, s.pressAlignment + 0.015)
      s.outputConsistency = Math.min(100, s.outputConsistency + 0.01)
    }

    for (let _i = this.stampers.length - 1; _i >= 0; _i--) { if (this.stampers[_i].stampingSkill <= 4) this.stampers.splice(_i, 1) }
  }

}
