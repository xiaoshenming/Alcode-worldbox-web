// Creature Beveller System (v3.662) - Metal bevelling artisans
// Craftspeople who cut angled edges on metal workpieces

import { EntityManager } from '../ecs/Entity'

export interface Beveller {
  id: number
  entityId: number
  bevellingSkill: number
  angleAccuracy: number
  edgeSmoothing: number
  chamferControl: number
  tick: number
}

const CHECK_INTERVAL = 2900
const RECRUIT_CHANCE = 0.0015
const MAX_BEVELLERS = 10

export class CreatureBevellerSystem {
  private bevellers: Beveller[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bevellers.length < MAX_BEVELLERS && Math.random() < RECRUIT_CHANCE) {
      this.bevellers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        bevellingSkill: 10 + Math.random() * 25,
        angleAccuracy: 15 + Math.random() * 20,
        edgeSmoothing: 5 + Math.random() * 20,
        chamferControl: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.bevellers) {
      b.bevellingSkill = Math.min(100, b.bevellingSkill + 0.02)
      b.angleAccuracy = Math.min(100, b.angleAccuracy + 0.015)
      b.chamferControl = Math.min(100, b.chamferControl + 0.01)
    }

    for (let _i = this.bevellers.length - 1; _i >= 0; _i--) { if (this.bevellers[_i].bevellingSkill <= 4) this.bevellers.splice(_i, 1) }
  }

  getBevellers(): Beveller[] { return this.bevellers }
}
