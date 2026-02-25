// Creature Fulling Makers System (v3.473) - Fulling artisans
// Crafters who clean and thicken cloth by pounding and pressing

import { EntityManager } from '../ecs/Entity'

export interface FullingMaker {
  id: number
  entityId: number
  poundingForce: number
  clothDensity: number
  shrinkageControl: number
  finishQuality: number
  tick: number
}

const CHECK_INTERVAL = 2530
const RECRUIT_CHANCE = 0.0016
const MAX_MAKERS = 11

export class CreatureFullingMakersSystem {
  private makers: FullingMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        poundingForce: 10 + Math.random() * 30,
        clothDensity: 15 + Math.random() * 20,
        shrinkageControl: 10 + Math.random() * 25,
        finishQuality: 10 + Math.random() * 20,
        tick,
      })
    }

    for (const m of this.makers) {
      m.poundingForce = Math.min(100, m.poundingForce + 0.02)
      m.clothDensity = Math.min(100, m.clothDensity + 0.015)
      m.finishQuality = Math.min(100, m.finishQuality + 0.01)
    }

    this.makers = this.makers.filter(m => m.poundingForce > 4)
  }

  getMakers(): FullingMaker[] { return this.makers }
}
