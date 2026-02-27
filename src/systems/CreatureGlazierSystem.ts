// Creature Glazier System (v3.482) - Glass crafting artisans
// Skilled workers cutting and fitting glass for windows and vessels

import { EntityManager } from '../ecs/Entity'

export interface Glazier {
  id: number
  entityId: number
  glassCutting: number
  leadWorking: number
  designPrecision: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2600
const RECRUIT_CHANCE = 0.0015
const MAX_GLAZIERS = 10

export class CreatureGlazierSystem {
  private glaziers: Glazier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.glaziers.length < MAX_GLAZIERS && Math.random() < RECRUIT_CHANCE) {
      this.glaziers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        glassCutting: 10 + Math.random() * 25,
        leadWorking: 15 + Math.random() * 20,
        designPrecision: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const g of this.glaziers) {
      g.glassCutting = Math.min(100, g.glassCutting + 0.02)
      g.designPrecision = Math.min(100, g.designPrecision + 0.015)
      g.outputQuality = Math.min(100, g.outputQuality + 0.01)
    }

    for (let _i = this.glaziers.length - 1; _i >= 0; _i--) { if (this.glaziers[_i].glassCutting <= 4) this.glaziers.splice(_i, 1) }
  }

  getGlaziers(): Glazier[] { return this.glaziers }
}
