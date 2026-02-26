// Creature Founder System (v3.596) - Metal founding artisans
// Craftspeople who cast molten metal into molds to create objects

import { EntityManager } from '../ecs/Entity'

export interface Founder {
  id: number
  entityId: number
  foundingSkill: number
  moldCrafting: number
  temperatureControl: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2760
const RECRUIT_CHANCE = 0.0014
const MAX_FOUNDERS = 10

export class CreatureFounderSystem {
  private founders: Founder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.founders.length < MAX_FOUNDERS && Math.random() < RECRUIT_CHANCE) {
      this.founders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        foundingSkill: 10 + Math.random() * 25,
        moldCrafting: 15 + Math.random() * 20,
        temperatureControl: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.founders) {
      f.foundingSkill = Math.min(100, f.foundingSkill + 0.02)
      f.moldCrafting = Math.min(100, f.moldCrafting + 0.015)
      f.outputQuality = Math.min(100, f.outputQuality + 0.01)
    }

    this.founders = this.founders.filter(f => f.foundingSkill > 4)
  }

  getFounders(): Founder[] { return this.founders }
}
