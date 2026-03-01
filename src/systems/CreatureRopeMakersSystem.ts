// Creature Rope Makers System (v3.458) - Rope-making artisans
// Crafters twisting and braiding fibers into strong ropes and cordage

import { EntityManager } from '../ecs/Entity'

export interface RopeMaker {
  id: number
  entityId: number
  twistStrength: number
  fiberSelection: number
  ropeLength: number
  durability: number
  tick: number
}

const CHECK_INTERVAL = 2510
const RECRUIT_CHANCE = 0.002
const MAX_MAKERS = 14

export class CreatureRopeMakersSystem {
  private makers: RopeMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        twistStrength: 10 + Math.random() * 30,
        fiberSelection: 15 + Math.random() * 20,
        ropeLength: 5 + Math.random() * 25,
        durability: 20 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.twistStrength = Math.min(100, m.twistStrength + 0.02)
      m.durability = Math.min(100, m.durability + 0.015)
      m.fiberSelection = Math.min(100, m.fiberSelection + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].twistStrength <= 4) this.makers.splice(_i, 1) }
  }

}
