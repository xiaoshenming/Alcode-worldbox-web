// Creature Gilder System (v3.578) - Gold leaf and gilding artisans
// Craftspeople who apply thin layers of gold to surfaces for decoration

import { EntityManager } from '../ecs/Entity'

export interface Gilder {
  id: number
  entityId: number
  gildingSkill: number
  leafApplication: number
  surfacePreparation: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2700
const RECRUIT_CHANCE = 0.0014
const MAX_GILDERS = 10

export class CreatureGilderSystem {
  private gilders: Gilder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.gilders.length < MAX_GILDERS && Math.random() < RECRUIT_CHANCE) {
      this.gilders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        gildingSkill: 10 + Math.random() * 25,
        leafApplication: 15 + Math.random() * 20,
        surfacePreparation: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const g of this.gilders) {
      g.gildingSkill = Math.min(100, g.gildingSkill + 0.02)
      g.leafApplication = Math.min(100, g.leafApplication + 0.015)
      g.outputQuality = Math.min(100, g.outputQuality + 0.01)
    }

    this.gilders = this.gilders.filter(g => g.gildingSkill > 4)
  }

  getGilders(): Gilder[] { return this.gilders }
}
