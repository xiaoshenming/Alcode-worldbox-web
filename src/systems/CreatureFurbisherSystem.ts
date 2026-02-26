// Creature Furbisher System (v3.632) - Metal polishing artisans
// Craftspeople who polish and refurbish armor and weapons

import { EntityManager } from '../ecs/Entity'

export interface Furbisher {
  id: number
  entityId: number
  furbishingSkill: number
  polishingTechnique: number
  surfaceRestoration: number
  lustreQuality: number
  tick: number
}

const CHECK_INTERVAL = 2840
const RECRUIT_CHANCE = 0.0015
const MAX_FURBISHERS = 10

export class CreatureFurbisherSystem {
  private furbishers: Furbisher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.furbishers.length < MAX_FURBISHERS && Math.random() < RECRUIT_CHANCE) {
      this.furbishers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        furbishingSkill: 10 + Math.random() * 25,
        polishingTechnique: 15 + Math.random() * 20,
        surfaceRestoration: 5 + Math.random() * 20,
        lustreQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.furbishers) {
      f.furbishingSkill = Math.min(100, f.furbishingSkill + 0.02)
      f.polishingTechnique = Math.min(100, f.polishingTechnique + 0.015)
      f.lustreQuality = Math.min(100, f.lustreQuality + 0.01)
    }

    this.furbishers = this.furbishers.filter(f => f.furbishingSkill > 4)
  }

  getFurbishers(): Furbisher[] { return this.furbishers }
}
