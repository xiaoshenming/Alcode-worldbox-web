// Creature Fletcher System (v3.506) - Arrow fletching artisans
// Skilled workers crafting arrow fletchings for ranged combat

import { EntityManager } from '../ecs/Entity'

export interface Fletcher {
  id: number
  entityId: number
  featherCutting: number
  shaftBinding: number
  flightTuning: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2550
const RECRUIT_CHANCE = 0.0016
const MAX_FLETCHERS = 10

export class CreatureFletcherSystem {
  private fletchers: Fletcher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fletchers.length < MAX_FLETCHERS && Math.random() < RECRUIT_CHANCE) {
      this.fletchers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        featherCutting: 10 + Math.random() * 25,
        shaftBinding: 15 + Math.random() * 20,
        flightTuning: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.fletchers) {
      f.featherCutting = Math.min(100, f.featherCutting + 0.02)
      f.flightTuning = Math.min(100, f.flightTuning + 0.015)
      f.outputQuality = Math.min(100, f.outputQuality + 0.01)
    }

    this.fletchers = this.fletchers.filter(f => f.featherCutting > 4)
  }

  getFletchers(): Fletcher[] { return this.fletchers }
}
