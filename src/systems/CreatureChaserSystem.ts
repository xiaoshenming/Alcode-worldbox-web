// Creature Chaser System (v3.587) - Metal chasing artisans
// Craftspeople who create raised designs on metal by hammering from the front

import { EntityManager } from '../ecs/Entity'

export interface Chaser {
  id: number
  entityId: number
  chasingSkill: number
  hammerControl: number
  reliefDepth: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2730
const RECRUIT_CHANCE = 0.0014
const MAX_CHASERS = 10

export class CreatureChaserSystem {
  private chasers: Chaser[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.chasers.length < MAX_CHASERS && Math.random() < RECRUIT_CHANCE) {
      this.chasers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        chasingSkill: 10 + Math.random() * 25,
        hammerControl: 15 + Math.random() * 20,
        reliefDepth: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const c of this.chasers) {
      c.chasingSkill = Math.min(100, c.chasingSkill + 0.02)
      c.hammerControl = Math.min(100, c.hammerControl + 0.015)
      c.outputQuality = Math.min(100, c.outputQuality + 0.01)
    }

    for (let _i = this.chasers.length - 1; _i >= 0; _i--) { if (this.chasers[_i].chasingSkill <= 4) this.chasers.splice(_i, 1) }
  }

}
