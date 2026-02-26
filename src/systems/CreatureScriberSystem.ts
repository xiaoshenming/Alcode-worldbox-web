// Creature Scriber System (v3.719) - Metal scribing artisans
// Craftspeople who mark metal surfaces with precise layout lines

import { EntityManager } from '../ecs/Entity'

export interface Scriber {
  id: number
  entityId: number
  scribingSkill: number
  lineAccuracy: number
  layoutPrecision: number
  markingDepth: number
  tick: number
}

const CHECK_INTERVAL = 3090
const RECRUIT_CHANCE = 0.0015
const MAX_SCRIBERS = 10

export class CreatureScriberSystem {
  private scribers: Scriber[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.scribers.length < MAX_SCRIBERS && Math.random() < RECRUIT_CHANCE) {
      this.scribers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        scribingSkill: 10 + Math.random() * 25,
        lineAccuracy: 15 + Math.random() * 20,
        layoutPrecision: 5 + Math.random() * 20,
        markingDepth: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.scribers) {
      s.scribingSkill = Math.min(100, s.scribingSkill + 0.02)
      s.lineAccuracy = Math.min(100, s.lineAccuracy + 0.015)
      s.markingDepth = Math.min(100, s.markingDepth + 0.01)
    }

    this.scribers = this.scribers.filter(s => s.scribingSkill > 4)
  }

  getScribers(): Scriber[] { return this.scribers }
}
