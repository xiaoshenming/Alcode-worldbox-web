// Creature Slotter System (v3.734) - Metal slotting artisans
// Craftspeople who cut slots, keyways and grooves in metal workpieces

import { EntityManager } from '../ecs/Entity'

export interface Slotter {
  id: number
  entityId: number
  slottingSkill: number
  keywayPrecision: number
  grooveDepth: number
  feedControl: number
  tick: number
}

const CHECK_INTERVAL = 3168
const RECRUIT_CHANCE = 0.0017
const MAX_SLOTTERS = 12

export class CreatureSlotterSystem {
  private slotters: Slotter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.slotters.length < MAX_SLOTTERS && Math.random() < RECRUIT_CHANCE) {
      this.slotters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        slottingSkill: 11 + Math.random() * 26,
        keywayPrecision: 13 + Math.random() * 21,
        grooveDepth: 7 + Math.random() * 19,
        feedControl: 12 + Math.random() * 22,
        tick,
      })
    }

    for (const s of this.slotters) {
      s.slottingSkill = Math.min(100, s.slottingSkill + 0.022)
      s.keywayPrecision = Math.min(100, s.keywayPrecision + 0.014)
      s.feedControl = Math.min(100, s.feedControl + 0.012)
    }

    for (let _i = this.slotters.length - 1; _i >= 0; _i--) { if (this.slotters[_i].slottingSkill <= 4) this.slotters.splice(_i, 1) }
  }

  getSlotters(): Slotter[] { return this.slotters }
}
