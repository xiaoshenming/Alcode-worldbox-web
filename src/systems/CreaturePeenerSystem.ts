// Creature Peener System (v3.656) - Metal peening artisans
// Craftspeople who hammer metal surfaces to strengthen and shape them

import { EntityManager } from '../ecs/Entity'

export interface Peener {
  id: number
  entityId: number
  peeningSkill: number
  hammerControl: number
  surfaceHardening: number
  stressRelief: number
  tick: number
}

const CHECK_INTERVAL = 2880
const RECRUIT_CHANCE = 0.0015
const MAX_PEENERS = 10

export class CreaturePeenerSystem {
  private peeners: Peener[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.peeners.length < MAX_PEENERS && Math.random() < RECRUIT_CHANCE) {
      this.peeners.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        peeningSkill: 10 + Math.random() * 25,
        hammerControl: 15 + Math.random() * 20,
        surfaceHardening: 5 + Math.random() * 20,
        stressRelief: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const p of this.peeners) {
      p.peeningSkill = Math.min(100, p.peeningSkill + 0.02)
      p.hammerControl = Math.min(100, p.hammerControl + 0.015)
      p.stressRelief = Math.min(100, p.stressRelief + 0.01)
    }

    for (let _i = this.peeners.length - 1; _i >= 0; _i--) { if (this.peeners[_i].peeningSkill <= 4) this.peeners.splice(_i, 1) }
  }

  getPeeners(): Peener[] { return this.peeners }
}
