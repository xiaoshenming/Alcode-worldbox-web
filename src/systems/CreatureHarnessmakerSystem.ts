// Creature Harnessmaker System (v3.518) - Harness crafting artisans
// Skilled workers creating harnesses and tack for draft animals

import { EntityManager } from '../ecs/Entity'

export interface Harnessmaker {
  id: number
  entityId: number
  leatherStitching: number
  buckleFitting: number
  strapCutting: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2610
const RECRUIT_CHANCE = 0.0014
const MAX_HARNESSMAKERS = 10

export class CreatureHarnessmakerSystem {
  private harnessmakers: Harnessmaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.harnessmakers.length < MAX_HARNESSMAKERS && Math.random() < RECRUIT_CHANCE) {
      this.harnessmakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherStitching: 10 + Math.random() * 25,
        buckleFitting: 15 + Math.random() * 20,
        strapCutting: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const h of this.harnessmakers) {
      h.leatherStitching = Math.min(100, h.leatherStitching + 0.02)
      h.strapCutting = Math.min(100, h.strapCutting + 0.015)
      h.outputQuality = Math.min(100, h.outputQuality + 0.01)
    }

    this.harnessmakers = this.harnessmakers.filter(h => h.leatherStitching > 4)
  }

  getHarnessmakers(): Harnessmaker[] { return this.harnessmakers }
}
