// Creature Swage Blocker System (v3.701) - Metal swage block artisans
// Craftspeople who shape metal using swage blocks with various cavities

import { EntityManager } from '../ecs/Entity'

export interface SwageBlocker {
  id: number
  entityId: number
  swageBlockSkill: number
  cavitySelection: number
  metalForming: number
  shapeAccuracy: number
  tick: number
}

const CHECK_INTERVAL = 3030
const RECRUIT_CHANCE = 0.0015
const MAX_SWAGEBLOCKERS = 10

export class CreatureSwageBlockerSystem {
  private swageBlockers: SwageBlocker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.swageBlockers.length < MAX_SWAGEBLOCKERS && Math.random() < RECRUIT_CHANCE) {
      this.swageBlockers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        swageBlockSkill: 10 + Math.random() * 25,
        cavitySelection: 15 + Math.random() * 20,
        metalForming: 5 + Math.random() * 20,
        shapeAccuracy: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.swageBlockers) {
      s.swageBlockSkill = Math.min(100, s.swageBlockSkill + 0.02)
      s.cavitySelection = Math.min(100, s.cavitySelection + 0.015)
      s.shapeAccuracy = Math.min(100, s.shapeAccuracy + 0.01)
    }

    this.swageBlockers = this.swageBlockers.filter(s => s.swageBlockSkill > 4)
  }

  getSwageBlockers(): SwageBlocker[] { return this.swageBlockers }
}
