// Creature Roller System (v3.623) - Metal rolling artisans
// Workers who shape metal by passing it through heavy rollers

import { EntityManager } from '../ecs/Entity'

export interface Roller {
  id: number
  entityId: number
  rollingSkill: number
  pressureControl: number
  thicknessAccuracy: number
  surfaceFinish: number
  tick: number
}

const CHECK_INTERVAL = 2810
const RECRUIT_CHANCE = 0.0014
const MAX_ROLLERS = 10

export class CreatureRollerSystem {
  private rollers: Roller[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.rollers.length < MAX_ROLLERS && Math.random() < RECRUIT_CHANCE) {
      this.rollers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        rollingSkill: 10 + Math.random() * 25,
        pressureControl: 15 + Math.random() * 20,
        thicknessAccuracy: 5 + Math.random() * 20,
        surfaceFinish: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const r of this.rollers) {
      r.rollingSkill = Math.min(100, r.rollingSkill + 0.02)
      r.pressureControl = Math.min(100, r.pressureControl + 0.015)
      r.surfaceFinish = Math.min(100, r.surfaceFinish + 0.01)
    }

    for (let _i = this.rollers.length - 1; _i >= 0; _i--) { if (this.rollers[_i].rollingSkill <= 4) this.rollers.splice(_i, 1) }
  }

  getRollers(): Roller[] { return this.rollers }
}
