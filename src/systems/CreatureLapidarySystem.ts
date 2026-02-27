// Creature Lapidary System (v3.575) - Gemstone cutting artisans
// Craftspeople who cut, polish, and set precious and semi-precious stones

import { EntityManager } from '../ecs/Entity'

export interface Lapidary {
  id: number
  entityId: number
  cuttingSkill: number
  polishingControl: number
  gemIdentification: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2690
const RECRUIT_CHANCE = 0.0014
const MAX_LAPIDARIES = 10

export class CreatureLapidarySystem {
  private lapidaries: Lapidary[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.lapidaries.length < MAX_LAPIDARIES && Math.random() < RECRUIT_CHANCE) {
      this.lapidaries.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        cuttingSkill: 10 + Math.random() * 25,
        polishingControl: 15 + Math.random() * 20,
        gemIdentification: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const l of this.lapidaries) {
      l.cuttingSkill = Math.min(100, l.cuttingSkill + 0.02)
      l.polishingControl = Math.min(100, l.polishingControl + 0.015)
      l.outputQuality = Math.min(100, l.outputQuality + 0.01)
    }

    for (let _i = this.lapidaries.length - 1; _i >= 0; _i--) { if (this.lapidaries[_i].cuttingSkill <= 4) this.lapidaries.splice(_i, 1) }
  }

  getLapidaries(): Lapidary[] { return this.lapidaries }
}
