// Creature Rope Walker System (v3.515) - Rope crafting artisans
// Skilled workers braiding and twisting fibers into strong ropes

import { EntityManager } from '../ecs/Entity'

export interface RopeWalker {
  id: number
  entityId: number
  fiberBraiding: number
  tensileStrength: number
  knotTying: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2590
const RECRUIT_CHANCE = 0.0015
const MAX_ROPEWALKERS = 10

export class CreatureRopeWalkerSystem {
  private ropeWalkers: RopeWalker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.ropeWalkers.length < MAX_ROPEWALKERS && Math.random() < RECRUIT_CHANCE) {
      this.ropeWalkers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        fiberBraiding: 10 + Math.random() * 25,
        tensileStrength: 15 + Math.random() * 20,
        knotTying: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const r of this.ropeWalkers) {
      r.fiberBraiding = Math.min(100, r.fiberBraiding + 0.02)
      r.knotTying = Math.min(100, r.knotTying + 0.015)
      r.outputQuality = Math.min(100, r.outputQuality + 0.01)
    }

    for (let _i = this.ropeWalkers.length - 1; _i >= 0; _i--) { if (this.ropeWalkers[_i].fiberBraiding <= 4) this.ropeWalkers.splice(_i, 1) }
  }

}
