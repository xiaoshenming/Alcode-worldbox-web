// Creature Spinning Makers System (v3.452) - Spinning artisans
// Crafters who spin raw fibers into yarn and thread for textile production

import { EntityManager } from '../ecs/Entity'

export interface SpinningMaker {
  id: number
  entityId: number
  spindleSpeed: number
  fiberQuality: number
  threadStrength: number
  consistency: number
  tick: number
}

const CHECK_INTERVAL = 2530
const RECRUIT_CHANCE = 0.0018
const MAX_MAKERS = 13

export class CreatureSpinningMakersSystem {
  private makers: SpinningMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        spindleSpeed: 10 + Math.random() * 25,
        fiberQuality: 15 + Math.random() * 20,
        threadStrength: 10 + Math.random() * 25,
        consistency: 20 + Math.random() * 20,
        tick,
      })
    }

    for (const m of this.makers) {
      m.spindleSpeed = Math.min(100, m.spindleSpeed + 0.02)
      m.threadStrength = Math.min(100, m.threadStrength + 0.015)
      m.consistency = Math.min(100, m.consistency + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].spindleSpeed <= 4) this.makers.splice(_i, 1) }
  }

  getMakers(): SpinningMaker[] { return this.makers }
}
