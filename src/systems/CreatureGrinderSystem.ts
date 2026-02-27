// Creature Grinder System (v3.732) - Metal grinding artisans
// Craftspeople who shape and finish metal using grinding wheels and abrasives

import { EntityManager } from '../ecs/Entity'

export interface Grinder {
  id: number
  entityId: number
  grindingSkill: number
  wheelControl: number
  surfaceFinish: number
  sparkManagement: number
  tick: number
}

const CHECK_INTERVAL = 3140
const RECRUIT_CHANCE = 0.0015
const MAX_GRINDERS = 10

export class CreatureGrinderSystem {
  private grinders: Grinder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.grinders.length < MAX_GRINDERS && Math.random() < RECRUIT_CHANCE) {
      this.grinders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        grindingSkill: 10 + Math.random() * 25,
        wheelControl: 15 + Math.random() * 20,
        surfaceFinish: 5 + Math.random() * 20,
        sparkManagement: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const g of this.grinders) {
      g.grindingSkill = Math.min(100, g.grindingSkill + 0.02)
      g.wheelControl = Math.min(100, g.wheelControl + 0.015)
      g.sparkManagement = Math.min(100, g.sparkManagement + 0.01)
    }

    for (let _i = this.grinders.length - 1; _i >= 0; _i--) { if (this.grinders[_i].grindingSkill <= 4) this.grinders.splice(_i, 1) }
  }

  getGrinders(): Grinder[] { return this.grinders }
}
