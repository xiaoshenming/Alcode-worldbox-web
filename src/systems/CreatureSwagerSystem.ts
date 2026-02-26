// Creature Swager System (v3.662) - Metal swaging artisans
// Craftspeople who shape metal using dies and hammering techniques

import { EntityManager } from '../ecs/Entity'

export interface Swager {
  id: number
  entityId: number
  swagingSkill: number
  dieAlignment: number
  metalForming: number
  dimensionalAccuracy: number
  tick: number
}

const CHECK_INTERVAL = 2900
const RECRUIT_CHANCE = 0.0015
const MAX_SWAGERS = 10

export class CreatureSwagerSystem {
  private swagers: Swager[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.swagers.length < MAX_SWAGERS && Math.random() < RECRUIT_CHANCE) {
      this.swagers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        swagingSkill: 10 + Math.random() * 25,
        dieAlignment: 15 + Math.random() * 20,
        metalForming: 5 + Math.random() * 20,
        dimensionalAccuracy: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.swagers) {
      s.swagingSkill = Math.min(100, s.swagingSkill + 0.02)
      s.dieAlignment = Math.min(100, s.dieAlignment + 0.015)
      s.dimensionalAccuracy = Math.min(100, s.dimensionalAccuracy + 0.01)
    }

    this.swagers = this.swagers.filter(s => s.swagingSkill > 4)
  }

  getSwagers(): Swager[] { return this.swagers }
}
