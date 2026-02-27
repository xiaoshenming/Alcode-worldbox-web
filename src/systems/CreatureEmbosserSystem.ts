// Creature Embosser System (v3.742) - Metal embossing artisans
// Craftspeople who create raised designs on metal surfaces using dies and presses

import { EntityManager } from '../ecs/Entity'

export interface Embosser {
  id: number
  entityId: number
  embossingSkill: number
  dieDesign: number
  pressureControl: number
  patternAccuracy: number
  tick: number
}

const CHECK_INTERVAL = 3275
const RECRUIT_CHANCE = 0.0015
const MAX_EMBOSSERS = 10

export class CreatureEmbosserSystem {
  private embossers: Embosser[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.embossers.length < MAX_EMBOSSERS && Math.random() < RECRUIT_CHANCE) {
      this.embossers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        embossingSkill: 10 + Math.random() * 25,
        dieDesign: 15 + Math.random() * 20,
        pressureControl: 5 + Math.random() * 20,
        patternAccuracy: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.embossers) {
      e.embossingSkill = Math.min(100, e.embossingSkill + 0.02)
      e.dieDesign = Math.min(100, e.dieDesign + 0.015)
      e.patternAccuracy = Math.min(100, e.patternAccuracy + 0.01)
    }

    for (let _i = this.embossers.length - 1; _i >= 0; _i--) { if (this.embossers[_i].embossingSkill <= 4) this.embossers.splice(_i, 1) }
  }

  getEmbossers(): Embosser[] { return this.embossers }
}
