// Creature Plowright System (v3.530) - Plow crafting artisans
// Skilled workers building and maintaining plows for agriculture

import { EntityManager } from '../ecs/Entity'

export interface Plowright {
  id: number
  entityId: number
  ironForging: number
  bladeSharpening: number
  handleFitting: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2610
const RECRUIT_CHANCE = 0.0015
const MAX_PLOWRIGHTS = 10

export class CreaturePlowrightSystem {
  private plowrights: Plowright[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.plowrights.length < MAX_PLOWRIGHTS && Math.random() < RECRUIT_CHANCE) {
      this.plowrights.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        ironForging: 10 + Math.random() * 25,
        bladeSharpening: 15 + Math.random() * 20,
        handleFitting: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.plowrights) {
      p.ironForging = Math.min(100, p.ironForging + 0.02)
      p.handleFitting = Math.min(100, p.handleFitting + 0.015)
      p.outputQuality = Math.min(100, p.outputQuality + 0.01)
    }

    for (let _i = this.plowrights.length - 1; _i >= 0; _i--) { if (this.plowrights[_i].ironForging <= 4) this.plowrights.splice(_i, 1) }
  }

  getPlowrights(): Plowright[] { return this.plowrights }
}
