// Creature Hornworker System (v3.497) - Horn crafting artisans
// Skilled workers shaping animal horns into tools and decorative items

import { EntityManager } from '../ecs/Entity'

export interface Hornworker {
  id: number
  entityId: number
  hornShaping: number
  heatTreatment: number
  carvingDetail: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2620
const RECRUIT_CHANCE = 0.0015
const MAX_WORKERS = 10

export class CreatureHornworkerSystem {
  private workers: Hornworker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.workers.length < MAX_WORKERS && Math.random() < RECRUIT_CHANCE) {
      this.workers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        hornShaping: 10 + Math.random() * 25,
        heatTreatment: 15 + Math.random() * 20,
        carvingDetail: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.workers) {
      w.hornShaping = Math.min(100, w.hornShaping + 0.02)
      w.carvingDetail = Math.min(100, w.carvingDetail + 0.015)
      w.outputQuality = Math.min(100, w.outputQuality + 0.01)
    }

    for (let _i = this.workers.length - 1; _i >= 0; _i--) { if (this.workers[_i].hornShaping <= 4) this.workers.splice(_i, 1) }
  }

}
