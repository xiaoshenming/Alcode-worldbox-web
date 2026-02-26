// Creature Pewterer System (v3.554) - Pewter casting artisans
// Craftsmen working with pewter alloys to create vessels and utensils

import { EntityManager } from '../ecs/Entity'

export interface Pewterer {
  id: number
  entityId: number
  alloyCasting: number
  moldWork: number
  polishing: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2630
const RECRUIT_CHANCE = 0.0014
const MAX_PEWTERERS = 10

export class CreaturePewtererSystem {
  private pewterers: Pewterer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pewterers.length < MAX_PEWTERERS && Math.random() < RECRUIT_CHANCE) {
      this.pewterers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        alloyCasting: 10 + Math.random() * 25,
        moldWork: 15 + Math.random() * 20,
        polishing: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.pewterers) {
      p.alloyCasting = Math.min(100, p.alloyCasting + 0.02)
      p.polishing = Math.min(100, p.polishing + 0.015)
      p.outputQuality = Math.min(100, p.outputQuality + 0.01)
    }

    this.pewterers = this.pewterers.filter(p => p.alloyCasting > 4)
  }

  getPewterers(): Pewterer[] { return this.pewterers }
}
