// Creature Welder System (v3.620) - Metal welding artisans
// Craftspeople who join metals through heat and pressure

import { EntityManager } from '../ecs/Entity'

export interface Welder {
  id: number
  entityId: number
  weldingSkill: number
  jointStrength: number
  heatPrecision: number
  metalBonding: number
  tick: number
}

const CHECK_INTERVAL = 2800
const RECRUIT_CHANCE = 0.0015
const MAX_WELDERS = 10

export class CreatureWelderSystem {
  private welders: Welder[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.welders.length < MAX_WELDERS && Math.random() < RECRUIT_CHANCE) {
      this.welders.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        weldingSkill: 10 + Math.random() * 25,
        jointStrength: 15 + Math.random() * 20,
        heatPrecision: 5 + Math.random() * 20,
        metalBonding: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.welders) {
      w.weldingSkill = Math.min(100, w.weldingSkill + 0.02)
      w.jointStrength = Math.min(100, w.jointStrength + 0.015)
      w.metalBonding = Math.min(100, w.metalBonding + 0.01)
    }

    for (let _i = this.welders.length - 1; _i >= 0; _i--) { if (this.welders[_i].weldingSkill <= 4) this.welders.splice(_i, 1) }
  }

  getWelders(): Welder[] { return this.welders }
}
