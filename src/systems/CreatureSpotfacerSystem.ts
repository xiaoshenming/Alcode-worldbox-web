// Creature Spotfacer System (v3.692) - Metal spotfacing artisans
// Craftspeople who create flat-bottomed recesses around holes for bearing surfaces

import { EntityManager } from '../ecs/Entity'

export interface Spotfacer {
  id: number
  entityId: number
  spotfacingSkill: number
  flatnessControl: number
  bearingSurface: number
  depthConsistency: number
  tick: number
}

const CHECK_INTERVAL = 3000
const RECRUIT_CHANCE = 0.0015
const MAX_SPOTFACERS = 10

export class CreatureSpotfacerSystem {
  private spotfacers: Spotfacer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.spotfacers.length < MAX_SPOTFACERS && Math.random() < RECRUIT_CHANCE) {
      this.spotfacers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        spotfacingSkill: 10 + Math.random() * 25,
        flatnessControl: 15 + Math.random() * 20,
        bearingSurface: 5 + Math.random() * 20,
        depthConsistency: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.spotfacers) {
      s.spotfacingSkill = Math.min(100, s.spotfacingSkill + 0.02)
      s.flatnessControl = Math.min(100, s.flatnessControl + 0.015)
      s.depthConsistency = Math.min(100, s.depthConsistency + 0.01)
    }

    this.spotfacers = this.spotfacers.filter(s => s.spotfacingSkill > 4)
  }

  getSpotfacers(): Spotfacer[] { return this.spotfacers }
}
