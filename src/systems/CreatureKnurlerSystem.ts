// Creature Knurler System (v3.671) - Metal knurling artisans
// Craftspeople who create textured patterns on metal surfaces for grip

import { EntityManager } from '../ecs/Entity'

export interface Knurler {
  id: number
  entityId: number
  knurlingSkill: number
  patternPrecision: number
  surfaceTexture: number
  gripQuality: number
  tick: number
}

const CHECK_INTERVAL = 2930
const RECRUIT_CHANCE = 0.0015
const MAX_KNURLERS = 10

export class CreatureKnurlerSystem {
  private knurlers: Knurler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.knurlers.length < MAX_KNURLERS && Math.random() < RECRUIT_CHANCE) {
      this.knurlers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        knurlingSkill: 10 + Math.random() * 25,
        patternPrecision: 15 + Math.random() * 20,
        surfaceTexture: 5 + Math.random() * 20,
        gripQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const k of this.knurlers) {
      k.knurlingSkill = Math.min(100, k.knurlingSkill + 0.02)
      k.patternPrecision = Math.min(100, k.patternPrecision + 0.015)
      k.gripQuality = Math.min(100, k.gripQuality + 0.01)
    }

    for (let _i = this.knurlers.length - 1; _i >= 0; _i--) { if (this.knurlers[_i].knurlingSkill <= 4) this.knurlers.splice(_i, 1) }
  }

}
