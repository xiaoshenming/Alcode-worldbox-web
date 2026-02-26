// Creature Fuller System (v3.707) - Metal fullering artisans
// Craftspeople who use fuller tools to spread and thin metal stock

import { EntityManager } from '../ecs/Entity'

export interface Fuller {
  id: number
  entityId: number
  fulleringSkill: number
  spreadControl: number
  metalThinning: number
  grooveDepth: number
  tick: number
}

const CHECK_INTERVAL = 3050
const RECRUIT_CHANCE = 0.0015
const MAX_FULLERS = 10

export class CreatureFullerSystem {
  private fullers: Fuller[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fullers.length < MAX_FULLERS && Math.random() < RECRUIT_CHANCE) {
      this.fullers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        fulleringSkill: 10 + Math.random() * 25,
        spreadControl: 15 + Math.random() * 20,
        metalThinning: 5 + Math.random() * 20,
        grooveDepth: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const f of this.fullers) {
      f.fulleringSkill = Math.min(100, f.fulleringSkill + 0.02)
      f.spreadControl = Math.min(100, f.spreadControl + 0.015)
      f.grooveDepth = Math.min(100, f.grooveDepth + 0.01)
    }

    this.fullers = this.fullers.filter(f => f.fulleringSkill > 4)
  }

  getFullers(): Fuller[] { return this.fullers }
}
