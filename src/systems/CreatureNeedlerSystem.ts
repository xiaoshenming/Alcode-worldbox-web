// Creature Needler System (v3.728) - Metal needling artisans
// Craftspeople who manufacture precision needles for various trades

import { EntityManager } from '../ecs/Entity'

export interface Needler {
  id: number
  entityId: number
  needlingSkill: number
  pointSharpness: number
  eyeForming: number
  tempeControl: number
  tick: number
}

const CHECK_INTERVAL = 3120
const RECRUIT_CHANCE = 0.0015
const MAX_NEEDLERS = 10

export class CreatureNeedlerSystem {
  private needlers: Needler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.needlers.length < MAX_NEEDLERS && Math.random() < RECRUIT_CHANCE) {
      this.needlers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        needlingSkill: 10 + Math.random() * 25,
        pointSharpness: 15 + Math.random() * 20,
        eyeForming: 5 + Math.random() * 20,
        tempeControl: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const n of this.needlers) {
      n.needlingSkill = Math.min(100, n.needlingSkill + 0.02)
      n.pointSharpness = Math.min(100, n.pointSharpness + 0.015)
      n.tempeControl = Math.min(100, n.tempeControl + 0.01)
    }

    this.needlers = this.needlers.filter(n => n.needlingSkill > 4)
  }

  getNeedlers(): Needler[] { return this.needlers }
}
