// Creature Bobbin Winder System (v3.467) - Bobbin winding artisans
// Crafters winding thread onto bobbins for weaving and sewing operations

import { EntityManager } from '../ecs/Entity'

export interface BobbinWinder {
  id: number
  entityId: number
  windingSpeed: number
  tensionAccuracy: number
  threadCapacity: number
  consistency: number
  tick: number
}

const CHECK_INTERVAL = 2520
const RECRUIT_CHANCE = 0.0019
const MAX_WINDERS = 13

export class CreatureBobbinWinderSystem {
  private winders: BobbinWinder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.winders.length < MAX_WINDERS && Math.random() < RECRUIT_CHANCE) {
      this.winders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        windingSpeed: 10 + Math.random() * 25,
        tensionAccuracy: 15 + Math.random() * 20,
        threadCapacity: 20 + Math.random() * 30,
        consistency: 10 + Math.random() * 20,
        tick,
      })
    }

    for (const w of this.winders) {
      w.windingSpeed = Math.min(100, w.windingSpeed + 0.02)
      w.tensionAccuracy = Math.min(100, w.tensionAccuracy + 0.015)
      w.consistency = Math.min(100, w.consistency + 0.01)
    }

    for (let _i = this.winders.length - 1; _i >= 0; _i--) { if (this.winders[_i].windingSpeed <= 4) this.winders.splice(_i, 1) }
  }

}
