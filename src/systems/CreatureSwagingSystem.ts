// Creature Swaging System (v3.741) - Metal swaging press artisans
// Craftspeople who shape metal using swaging presses and rotary forging machines

import { EntityManager } from '../ecs/Entity'

export interface SwagingWorker {
  id: number
  entityId: number
  swagingSkill: number
  forgeAccuracy: number
  pressOperation: number
  dieAlignment: number
  tick: number
}

const CHECK_INTERVAL = 3260
const RECRUIT_CHANCE = 0.0016
const MAX_SWAGING_WORKERS = 10

export class CreatureSwagingSystem {
  private workers: SwagingWorker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.workers.length < MAX_SWAGING_WORKERS && Math.random() < RECRUIT_CHANCE) {
      this.workers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        swagingSkill: 10 + Math.random() * 25,
        forgeAccuracy: 15 + Math.random() * 20,
        pressOperation: 5 + Math.random() * 20,
        dieAlignment: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.workers) {
      w.swagingSkill = Math.min(100, w.swagingSkill + 0.02)
      w.forgeAccuracy = Math.min(100, w.forgeAccuracy + 0.015)
      w.dieAlignment = Math.min(100, w.dieAlignment + 0.01)
    }

    for (let _i = this.workers.length - 1; _i >= 0; _i--) { if (this.workers[_i].swagingSkill <= 4) this.workers.splice(_i, 1) }
  }

  getSwagingWorkers(): SwagingWorker[] { return this.workers }
}
