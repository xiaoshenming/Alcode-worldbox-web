// Creature Staker System (v3.722) - Metal staking artisans
// Craftspeople who permanently join parts by deforming metal with staking tools

import { EntityManager } from '../ecs/Entity'

export interface Staker {
  id: number
  entityId: number
  stakingSkill: number
  deformControl: number
  jointStrength: number
  toolPrecision: number
  tick: number
}

const CHECK_INTERVAL = 3100
const RECRUIT_CHANCE = 0.0015
const MAX_STAKERS = 10

export class CreatureStakerSystem {
  private stakers: Staker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.stakers.length < MAX_STAKERS && Math.random() < RECRUIT_CHANCE) {
      this.stakers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        stakingSkill: 10 + Math.random() * 25,
        deformControl: 15 + Math.random() * 20,
        jointStrength: 5 + Math.random() * 20,
        toolPrecision: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.stakers) {
      s.stakingSkill = Math.min(100, s.stakingSkill + 0.02)
      s.deformControl = Math.min(100, s.deformControl + 0.015)
      s.toolPrecision = Math.min(100, s.toolPrecision + 0.01)
    }

    for (let _i = this.stakers.length - 1; _i >= 0; _i--) { if (this.stakers[_i].stakingSkill <= 4) this.stakers.splice(_i, 1) }
  }

}
