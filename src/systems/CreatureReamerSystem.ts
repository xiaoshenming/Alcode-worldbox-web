// Creature Reamer System (v3.674) - Metal reaming artisans
// Craftspeople who enlarge and finish drilled holes to precise dimensions

import { EntityManager } from '../ecs/Entity'

export interface Reamer {
  id: number
  entityId: number
  reamingSkill: number
  holePrecision: number
  surfaceFinish: number
  dimensionalTolerance: number
  tick: number
}

const CHECK_INTERVAL = 2940
const RECRUIT_CHANCE = 0.0015
const MAX_REAMERS = 10

export class CreatureReamerSystem {
  private reamers: Reamer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.reamers.length < MAX_REAMERS && Math.random() < RECRUIT_CHANCE) {
      this.reamers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        reamingSkill: 10 + Math.random() * 25,
        holePrecision: 15 + Math.random() * 20,
        surfaceFinish: 5 + Math.random() * 20,
        dimensionalTolerance: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const r of this.reamers) {
      r.reamingSkill = Math.min(100, r.reamingSkill + 0.02)
      r.holePrecision = Math.min(100, r.holePrecision + 0.015)
      r.dimensionalTolerance = Math.min(100, r.dimensionalTolerance + 0.01)
    }

    this.reamers = this.reamers.filter(r => r.reamingSkill > 4)
  }

  getReamers(): Reamer[] { return this.reamers }
}
