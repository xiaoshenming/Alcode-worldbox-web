// Creature Tinker System (v3.494) - Tinker artisans
// Itinerant crafters repairing and mending metal household items

import { EntityManager } from '../ecs/Entity'

export interface Tinker {
  id: number
  entityId: number
  metalRepair: number
  solderingSkill: number
  resourcefulness: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2610
const RECRUIT_CHANCE = 0.0015
const MAX_TINKERS = 10

export class CreatureTinkerSystem {
  private tinkers: Tinker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tinkers.length < MAX_TINKERS && Math.random() < RECRUIT_CHANCE) {
      this.tinkers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        metalRepair: 10 + Math.random() * 25,
        solderingSkill: 15 + Math.random() * 20,
        resourcefulness: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.tinkers) {
      t.metalRepair = Math.min(100, t.metalRepair + 0.02)
      t.resourcefulness = Math.min(100, t.resourcefulness + 0.015)
      t.outputQuality = Math.min(100, t.outputQuality + 0.01)
    }

    for (let _i = this.tinkers.length - 1; _i >= 0; _i--) { if (this.tinkers[_i].metalRepair <= 4) this.tinkers.splice(_i, 1) }
  }

}
