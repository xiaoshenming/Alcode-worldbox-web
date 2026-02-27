// Creature Wheelwright System (v3.512) - Wheel crafting artisans
// Skilled workers building and repairing wheels for carts and wagons

import { EntityManager } from '../ecs/Entity'

export interface Wheelwright {
  id: number
  entityId: number
  woodBending: number
  spokeFitting: number
  rimShaping: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2620
const RECRUIT_CHANCE = 0.0014
const MAX_WHEELWRIGHTS = 10

export class CreatureWheelwrightSystem {
  private wheelwrights: Wheelwright[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.wheelwrights.length < MAX_WHEELWRIGHTS && Math.random() < RECRUIT_CHANCE) {
      this.wheelwrights.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        woodBending: 10 + Math.random() * 25,
        spokeFitting: 15 + Math.random() * 20,
        rimShaping: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.wheelwrights) {
      w.woodBending = Math.min(100, w.woodBending + 0.02)
      w.rimShaping = Math.min(100, w.rimShaping + 0.015)
      w.outputQuality = Math.min(100, w.outputQuality + 0.01)
    }

    for (let _i = this.wheelwrights.length - 1; _i >= 0; _i--) { if (this.wheelwrights[_i].woodBending <= 4) this.wheelwrights.splice(_i, 1) }
  }

  getWheelwrights(): Wheelwright[] { return this.wheelwrights }
}
