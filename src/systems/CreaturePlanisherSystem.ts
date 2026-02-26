// Creature Planisher System (v3.599) - Metal planishing artisans
// Craftspeople who smooth and flatten metal surfaces with specialized hammers

import { EntityManager } from '../ecs/Entity'

export interface Planisher {
  id: number
  entityId: number
  planishingSkill: number
  hammerControl: number
  surfaceFinish: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2770
const RECRUIT_CHANCE = 0.0014
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
        hammerControl: 15 + Math.random() * 20,
        surfaceFinish: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.planishers) {
      p.planishingSkill = Math.min(100, p.planishingSkill + 0.02)
      p.hammerControl = Math.min(100, p.hammerControl + 0.015)
      p.outputQuality = Math.min(100, p.outputQuality + 0.01)
    }

    this.planishers = this.planishers.filter(p => p.planishingSkill > 4)
  }

  getPlanishers(): Planisher[] { return this.planishers }
}
