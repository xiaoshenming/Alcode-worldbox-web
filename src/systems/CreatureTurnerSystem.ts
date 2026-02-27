// Creature Turner System (v3.569) - Lathe turning artisans
// Craftspeople who shape wood and metal on lathes

import { EntityManager } from '../ecs/Entity'

export interface Turner {
  id: number
  entityId: number
  turningSkill: number
  latheControl: number
  shapeAccuracy: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2670
const RECRUIT_CHANCE = 0.0014
const MAX_TURNERS = 10

export class CreatureTurnerSystem {
  private turners: Turner[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.turners.length < MAX_TURNERS && Math.random() < RECRUIT_CHANCE) {
      this.turners.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        turningSkill: 10 + Math.random() * 25,
        latheControl: 15 + Math.random() * 20,
        shapeAccuracy: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.turners) {
      t.turningSkill = Math.min(100, t.turningSkill + 0.02)
      t.latheControl = Math.min(100, t.latheControl + 0.015)
      t.outputQuality = Math.min(100, t.outputQuality + 0.01)
    }

    for (let _i = this.turners.length - 1; _i >= 0; _i--) { if (this.turners[_i].turningSkill <= 4) this.turners.splice(_i, 1) }
  }

  getTurners(): Turner[] { return this.turners }
}
