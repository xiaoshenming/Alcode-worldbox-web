// Creature Burnisher System (v3.641) - Metal burnishing artisans
// Craftspeople who smooth and polish metal surfaces by rubbing

import { EntityManager } from '../ecs/Entity'

export interface Burnisher {
  id: number
  entityId: number
  burnishingSkill: number
  pressureTechnique: number
  surfaceSmoothness: number
  reflectiveFinish: number
  tick: number
}

const CHECK_INTERVAL = 2870
const RECRUIT_CHANCE = 0.0015
const MAX_BURNISHERS = 10

export class CreatureBurnisherSystem {
  private burnishers: Burnisher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.burnishers.length < MAX_BURNISHERS && Math.random() < RECRUIT_CHANCE) {
      this.burnishers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        burnishingSkill: 10 + Math.random() * 25,
        pressureTechnique: 15 + Math.random() * 20,
        surfaceSmoothness: 5 + Math.random() * 20,
        reflectiveFinish: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.burnishers) {
      b.burnishingSkill = Math.min(100, b.burnishingSkill + 0.02)
      b.pressureTechnique = Math.min(100, b.pressureTechnique + 0.015)
      b.reflectiveFinish = Math.min(100, b.reflectiveFinish + 0.01)
    }

    for (let _i = this.burnishers.length - 1; _i >= 0; _i--) { if (this.burnishers[_i].burnishingSkill <= 4) this.burnishers.splice(_i, 1) }
  }

  getBurnishers(): Burnisher[] { return this.burnishers }
}
