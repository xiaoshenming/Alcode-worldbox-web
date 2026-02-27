// Creature Chiseller System (v3.668) - Metal chiselling artisans
// Craftspeople who cut and shape metal using chisels and hammers

import { EntityManager } from '../ecs/Entity'

export interface Chiseller {
  id: number
  entityId: number
  chisellingSkill: number
  cuttingPrecision: number
  metalCarving: number
  edgeDefinition: number
  tick: number
}

const CHECK_INTERVAL = 2920
const RECRUIT_CHANCE = 0.0015
const MAX_CHISELLERS = 10

export class CreatureChisellerSystem {
  private chisellers: Chiseller[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.chisellers.length < MAX_CHISELLERS && Math.random() < RECRUIT_CHANCE) {
      this.chisellers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        chisellingSkill: 10 + Math.random() * 25,
        cuttingPrecision: 15 + Math.random() * 20,
        metalCarving: 5 + Math.random() * 20,
        edgeDefinition: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.chisellers) {
      c.chisellingSkill = Math.min(100, c.chisellingSkill + 0.02)
      c.cuttingPrecision = Math.min(100, c.cuttingPrecision + 0.015)
      c.edgeDefinition = Math.min(100, c.edgeDefinition + 0.01)
    }

    for (let _i = this.chisellers.length - 1; _i >= 0; _i--) { if (this.chisellers[_i].chisellingSkill <= 4) this.chisellers.splice(_i, 1) }
  }

  getChisellers(): Chiseller[] { return this.chisellers }
}
