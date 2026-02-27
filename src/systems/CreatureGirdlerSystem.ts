// Creature Girdler System (v3.551) - Belt and girdle crafting artisans
// Leatherworkers specializing in belts, girdles, and strapping

import { EntityManager } from '../ecs/Entity'

export interface Girdler {
  id: number
  entityId: number
  leatherCutting: number
  buckleMaking: number
  stitchWork: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2610
const RECRUIT_CHANCE = 0.0014
const MAX_GIRDLERS = 10

export class CreatureGirdlerSystem {
  private girdlers: Girdler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.girdlers.length < MAX_GIRDLERS && Math.random() < RECRUIT_CHANCE) {
      this.girdlers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherCutting: 10 + Math.random() * 25,
        buckleMaking: 15 + Math.random() * 20,
        stitchWork: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const g of this.girdlers) {
      g.leatherCutting = Math.min(100, g.leatherCutting + 0.02)
      g.stitchWork = Math.min(100, g.stitchWork + 0.015)
      g.outputQuality = Math.min(100, g.outputQuality + 0.01)
    }

    for (let _i = this.girdlers.length - 1; _i >= 0; _i--) { if (this.girdlers[_i].leatherCutting <= 4) this.girdlers.splice(_i, 1) }
  }

  getGirdlers(): Girdler[] { return this.girdlers }
}
