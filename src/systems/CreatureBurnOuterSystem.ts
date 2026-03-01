// Creature Burn Outer System (v3.716) - Metal burn-out artisans
// Craftspeople who remove material using thermal cutting processes

import { EntityManager } from '../ecs/Entity'

export interface BurnOuter {
  id: number
  entityId: number
  burnOutSkill: number
  thermalControl: number
  cutPrecision: number
  materialRemoval: number
  tick: number
}

const CHECK_INTERVAL = 3080
const RECRUIT_CHANCE = 0.0015
const MAX_BURNOUTERS = 10

export class CreatureBurnOuterSystem {
  private burnOuters: BurnOuter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.burnOuters.length < MAX_BURNOUTERS && Math.random() < RECRUIT_CHANCE) {
      this.burnOuters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        burnOutSkill: 10 + Math.random() * 25,
        thermalControl: 15 + Math.random() * 20,
        cutPrecision: 5 + Math.random() * 20,
        materialRemoval: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const b of this.burnOuters) {
      b.burnOutSkill = Math.min(100, b.burnOutSkill + 0.02)
      b.thermalControl = Math.min(100, b.thermalControl + 0.015)
      b.materialRemoval = Math.min(100, b.materialRemoval + 0.01)
    }

    for (let _i = this.burnOuters.length - 1; _i >= 0; _i--) { if (this.burnOuters[_i].burnOutSkill <= 4) this.burnOuters.splice(_i, 1) }
  }

}
