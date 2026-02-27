// Creature Crimper System (v3.739) - Metal crimping artisans
// Craftspeople who join metal sheets by folding and pressing edges together

import { EntityManager } from '../ecs/Entity'

export interface Crimper {
  id: number
  entityId: number
  crimpingSkill: number
  seamPrecision: number
  edgeFolding: number
  dieMaintenance: number
  tick: number
}

const CHECK_INTERVAL = 3230
const RECRUIT_CHANCE = 0.0015
const MAX_CRIMPERS = 10

export class CreatureCrimperSystem {
  private crimpers: Crimper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.crimpers.length < MAX_CRIMPERS && Math.random() < RECRUIT_CHANCE) {
      this.crimpers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        crimpingSkill: 10 + Math.random() * 25,
        seamPrecision: 15 + Math.random() * 20,
        edgeFolding: 5 + Math.random() * 20,
        dieMaintenance: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.crimpers) {
      c.crimpingSkill = Math.min(100, c.crimpingSkill + 0.02)
      c.seamPrecision = Math.min(100, c.seamPrecision + 0.015)
      c.dieMaintenance = Math.min(100, c.dieMaintenance + 0.01)
    }

    for (let _i = this.crimpers.length - 1; _i >= 0; _i--) { if (this.crimpers[_i].crimpingSkill <= 4) this.crimpers.splice(_i, 1) }
  }

  getCrimpers(): Crimper[] { return this.crimpers }
}
