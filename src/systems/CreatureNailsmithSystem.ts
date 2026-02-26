// Creature Nailsmith System (v3.539) - Nail forging specialists
// Artisans dedicated to producing nails and fasteners for construction

import { EntityManager } from '../ecs/Entity'

export interface Nailsmith {
  id: number
  entityId: number
  ironDrawing: number
  headForming: number
  pointShaping: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2620
const RECRUIT_CHANCE = 0.0014
const MAX_NAILSMITHS = 10

export class CreatureNailsmithSystem {
  private nailsmiths: Nailsmith[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.nailsmiths.length < MAX_NAILSMITHS && Math.random() < RECRUIT_CHANCE) {
      this.nailsmiths.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        ironDrawing: 10 + Math.random() * 25,
        headForming: 15 + Math.random() * 20,
        pointShaping: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const n of this.nailsmiths) {
      n.ironDrawing = Math.min(100, n.ironDrawing + 0.02)
      n.pointShaping = Math.min(100, n.pointShaping + 0.015)
      n.outputQuality = Math.min(100, n.outputQuality + 0.01)
    }

    this.nailsmiths = this.nailsmiths.filter(n => n.ironDrawing > 4)
  }

  getNailsmiths(): Nailsmith[] { return this.nailsmiths }
}
