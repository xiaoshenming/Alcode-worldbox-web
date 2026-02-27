// Creature Bridlemaker System (v3.524) - Bridle crafting artisans
// Skilled workers creating bridles and headstalls for horses

import { EntityManager } from '../ecs/Entity'

export interface Bridlemaker {
  id: number
  entityId: number
  leatherBraiding: number
  bitForging: number
  reinCrafting: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2600
const RECRUIT_CHANCE = 0.0015
const MAX_BRIDLEMAKERS = 10

export class CreatureBridlemakerSystem {
  private bridlemakers: Bridlemaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bridlemakers.length < MAX_BRIDLEMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.bridlemakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherBraiding: 10 + Math.random() * 25,
        bitForging: 15 + Math.random() * 20,
        reinCrafting: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.bridlemakers) {
      b.leatherBraiding = Math.min(100, b.leatherBraiding + 0.02)
      b.reinCrafting = Math.min(100, b.reinCrafting + 0.015)
      b.outputQuality = Math.min(100, b.outputQuality + 0.01)
    }

    for (let _i = this.bridlemakers.length - 1; _i >= 0; _i--) { if (this.bridlemakers[_i].leatherBraiding <= 4) this.bridlemakers.splice(_i, 1) }
  }

  getBridlemakers(): Bridlemaker[] { return this.bridlemakers }
}
