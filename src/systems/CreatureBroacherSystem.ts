// Creature Broacher System (v3.677) - Metal broaching artisans
// Craftspeople who cut precise internal shapes using toothed broaching tools

import { EntityManager } from '../ecs/Entity'

export interface Broacher {
  id: number
  entityId: number
  broachingSkill: number
  toothAlignment: number
  internalShaping: number
  keywayCutting: number
  tick: number
}

const CHECK_INTERVAL = 2950
const RECRUIT_CHANCE = 0.0015
const MAX_BROACHERS = 10

export class CreatureBroacherSystem {
  private broachers: Broacher[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.broachers.length < MAX_BROACHERS && Math.random() < RECRUIT_CHANCE) {
      this.broachers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        broachingSkill: 10 + Math.random() * 25,
        toothAlignment: 15 + Math.random() * 20,
        internalShaping: 5 + Math.random() * 20,
        keywayCutting: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.broachers) {
      b.broachingSkill = Math.min(100, b.broachingSkill + 0.02)
      b.toothAlignment = Math.min(100, b.toothAlignment + 0.015)
      b.keywayCutting = Math.min(100, b.keywayCutting + 0.01)
    }

    for (let _i = this.broachers.length - 1; _i >= 0; _i--) { if (this.broachers[_i].broachingSkill <= 4) this.broachers.splice(_i, 1) }
  }

  getBroachers(): Broacher[] { return this.broachers }
}
