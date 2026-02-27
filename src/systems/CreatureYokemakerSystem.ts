// Creature Yokemaker System (v3.527) - Yoke crafting artisans
// Skilled workers carving and fitting yokes for draft animals

import { EntityManager } from '../ecs/Entity'

export interface Yokemaker {
  id: number
  entityId: number
  woodCarving: number
  yokeFitting: number
  balanceWork: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2640
const RECRUIT_CHANCE = 0.0014
const MAX_YOKEMAKERS = 10

export class CreatureYokemakerSystem {
  private yokemakers: Yokemaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.yokemakers.length < MAX_YOKEMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.yokemakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        woodCarving: 10 + Math.random() * 25,
        yokeFitting: 15 + Math.random() * 20,
        balanceWork: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const y of this.yokemakers) {
      y.woodCarving = Math.min(100, y.woodCarving + 0.02)
      y.balanceWork = Math.min(100, y.balanceWork + 0.015)
      y.outputQuality = Math.min(100, y.outputQuality + 0.01)
    }

    for (let _i = this.yokemakers.length - 1; _i >= 0; _i--) { if (this.yokemakers[_i].woodCarving <= 4) this.yokemakers.splice(_i, 1) }
  }

  getYokemakers(): Yokemaker[] { return this.yokemakers }
}
