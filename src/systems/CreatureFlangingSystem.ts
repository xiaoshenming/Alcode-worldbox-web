// Creature Flanging System (v3.740) - Metal flanging artisans
// Craftspeople who bend and form flanges on metal workpieces using presses

import { EntityManager } from '../ecs/Entity'

export interface FlangingWorker {
  id: number
  entityId: number
  flangingSkill: number
  bendAccuracy: number
  pressOperation: number
  flangeInspection: number
  tick: number
}

const CHECK_INTERVAL = 3245
const RECRUIT_CHANCE = 0.0014
const MAX_FLANGING_WORKERS = 10

export class CreatureFlangingSystem {
  private workers: FlangingWorker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.workers.length < MAX_FLANGING_WORKERS && Math.random() < RECRUIT_CHANCE) {
      this.workers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        flangingSkill: 10 + Math.random() * 25,
        bendAccuracy: 15 + Math.random() * 20,
        pressOperation: 5 + Math.random() * 20,
        flangeInspection: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.workers) {
      w.flangingSkill = Math.min(100, w.flangingSkill + 0.02)
      w.bendAccuracy = Math.min(100, w.bendAccuracy + 0.015)
      w.flangeInspection = Math.min(100, w.flangeInspection + 0.01)
    }

    this.workers = this.workers.filter(w => w.flangingSkill > 4)
  }

  getFlangingWorkers(): FlangingWorker[] { return this.workers }
}
