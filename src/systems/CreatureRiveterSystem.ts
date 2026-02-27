// Creature Riveter System (v3.563) - Riveting specialists
// Metalworkers who join metal plates using rivets for construction

import { EntityManager } from '../ecs/Entity'

export interface Riveter {
  id: number
  entityId: number
  holeAlignment: number
  hammerWork: number
  jointStrength: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2640
const RECRUIT_CHANCE = 0.0014
const MAX_RIVETERS = 10

export class CreatureRiveterSystem {
  private riveters: Riveter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.riveters.length < MAX_RIVETERS && Math.random() < RECRUIT_CHANCE) {
      this.riveters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        holeAlignment: 10 + Math.random() * 25,
        hammerWork: 15 + Math.random() * 20,
        jointStrength: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const r of this.riveters) {
      r.holeAlignment = Math.min(100, r.holeAlignment + 0.02)
      r.jointStrength = Math.min(100, r.jointStrength + 0.015)
      r.outputQuality = Math.min(100, r.outputQuality + 0.01)
    }

    for (let _i = this.riveters.length - 1; _i >= 0; _i--) { if (this.riveters[_i].holeAlignment <= 4) this.riveters.splice(_i, 1) }
  }

  getRiveters(): Riveter[] { return this.riveters }
}
