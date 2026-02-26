// Creature Planisher System (v3.659) - Metal planishing artisans
// Craftspeople who smooth metal by hammering with a flat-faced tool

import { EntityManager } from '../ecs/Entity'

export interface Planisher {
  id: number
  entityId: number
  planishingSkill: number
  hammerPrecision: number
  surfaceFlatness: number
  metalAlignment: number
  tick: number
}

const CHECK_INTERVAL = 2890
const RECRUIT_CHANCE = 0.0015
const MAX_PLANISHERS = 10

export class CreaturePlanisherSystem {
  private planishers: Planisher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.planishers.length < MAX_PLANISHERS && Math.random() < RECRUIT_CHANCE) {
      this.planishers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        planishingSkill: 10 + Math.random() * 25,
        hammerPrecision: 15 + Math.random() * 20,
        surfaceFlatness: 5 + Math.random() * 20,
        metalAlignment: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.planishers) {
      p.planishingSkill = Math.min(100, p.planishingSkill + 0.02)
      p.hammerPrecision = Math.min(100, p.hammerPrecision + 0.015)
      p.metalAlignment = Math.min(100, p.metalAlignment + 0.01)
    }

    this.planishers = this.planishers.filter(p => p.planishingSkill > 4)
  }

  getPlanishers(): Planisher[] { return this.planishers }
}
