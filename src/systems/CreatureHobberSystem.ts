// Creature Hobber System (v3.733) - Metal hobbing artisans
// Craftspeople who cut gears, splines and other forms using hobbing machines

import { EntityManager } from '../ecs/Entity'

export interface Hobber {
  id: number
  entityId: number
  hobbingSkill: number
  gearCutting: number
  splineForming: number
  indexAccuracy: number
  tick: number
}

const CHECK_INTERVAL = 3155
const RECRUIT_CHANCE = 0.0016
const MAX_HOBBERS = 11

export class CreatureHobberSystem {
  private hobbers: Hobber[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.hobbers.length < MAX_HOBBERS && Math.random() < RECRUIT_CHANCE) {
      this.hobbers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        hobbingSkill: 12 + Math.random() * 24,
        gearCutting: 14 + Math.random() * 22,
        splineForming: 6 + Math.random() * 18,
        indexAccuracy: 11 + Math.random() * 23,
        tick,
      })
    }

    for (const h of this.hobbers) {
      h.hobbingSkill = Math.min(100, h.hobbingSkill + 0.021)
      h.gearCutting = Math.min(100, h.gearCutting + 0.016)
      h.indexAccuracy = Math.min(100, h.indexAccuracy + 0.011)
    }

    this.hobbers = this.hobbers.filter(h => h.hobbingSkill > 4)
  }

  getHobbers(): Hobber[] { return this.hobbers }
}
