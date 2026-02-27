// Creature Tatami Makers System (v3.476) - Tatami mat artisans
// Skilled crafters producing traditional woven floor mats

import { EntityManager } from '../ecs/Entity'

export interface TatamiMaker {
  id: number
  entityId: number
  rushWeaving: number
  frameCrafting: number
  matDensity: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2560
const RECRUIT_CHANCE = 0.0017
const MAX_MAKERS = 12

export class CreatureTatamiMakersSystem {
  private makers: TatamiMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        rushWeaving: 10 + Math.random() * 25,
        frameCrafting: 15 + Math.random() * 20,
        matDensity: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.rushWeaving = Math.min(100, m.rushWeaving + 0.02)
      m.matDensity = Math.min(100, m.matDensity + 0.015)
      m.outputQuality = Math.min(100, m.outputQuality + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].rushWeaving <= 4) this.makers.splice(_i, 1) }
  }

  getMakers(): TatamiMaker[] { return this.makers }
}
