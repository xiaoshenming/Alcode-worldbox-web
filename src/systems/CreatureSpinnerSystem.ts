// Creature Spinner System (v3.629) - Metal spinning artisans
// Craftspeople who shape sheet metal over rotating forms

import { EntityManager } from '../ecs/Entity'

export interface Spinner {
  id: number
  entityId: number
  spinningSkill: number
  latheControl: number
  formPrecision: number
  symmetryQuality: number
  tick: number
}

const CHECK_INTERVAL = 2830
const RECRUIT_CHANCE = 0.0014
const MAX_SPINNERS = 10

export class CreatureSpinnerSystem {
  private spinners: Spinner[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.spinners.length < MAX_SPINNERS && Math.random() < RECRUIT_CHANCE) {
      this.spinners.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        spinningSkill: 10 + Math.random() * 25,
        latheControl: 15 + Math.random() * 20,
        formPrecision: 5 + Math.random() * 20,
        symmetryQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.spinners) {
      s.spinningSkill = Math.min(100, s.spinningSkill + 0.02)
      s.latheControl = Math.min(100, s.latheControl + 0.015)
      s.symmetryQuality = Math.min(100, s.symmetryQuality + 0.01)
    }

    this.spinners = this.spinners.filter(s => s.spinningSkill > 4)
  }

  getSpinners(): Spinner[] { return this.spinners }
}
