// Creature Honer System (v3.680) - Metal honing artisans
// Craftspeople who use abrasive stones to achieve precise surface finishes

import { EntityManager } from '../ecs/Entity'

export interface Honer {
  id: number
  entityId: number
  honingSkill: number
  abrasiveControl: number
  surfacePrecision: number
  crosshatchAngle: number
  tick: number
}

const CHECK_INTERVAL = 2960
const RECRUIT_CHANCE = 0.0015
const MAX_HONERS = 10

export class CreatureHonerSystem {
  private honers: Honer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.honers.length < MAX_HONERS && Math.random() < RECRUIT_CHANCE) {
      this.honers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        honingSkill: 10 + Math.random() * 25,
        abrasiveControl: 15 + Math.random() * 20,
        surfacePrecision: 5 + Math.random() * 20,
        crosshatchAngle: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const h of this.honers) {
      h.honingSkill = Math.min(100, h.honingSkill + 0.02)
      h.abrasiveControl = Math.min(100, h.abrasiveControl + 0.015)
      h.crosshatchAngle = Math.min(100, h.crosshatchAngle + 0.01)
    }

    for (let _i = this.honers.length - 1; _i >= 0; _i--) { if (this.honers[_i].honingSkill <= 4) this.honers.splice(_i, 1) }
  }

}
