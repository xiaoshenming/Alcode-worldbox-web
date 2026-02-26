// Creature Hammerman System (v3.653) - Hammer mill operators
// Workers who operate trip hammers for heavy metalworking

import { EntityManager } from '../ecs/Entity'

export interface Hammerman {
  id: number
  entityId: number
  hammeringSkill: number
  rhythmControl: number
  strikeForce: number
  metalShaping: number
  tick: number
}

const CHECK_INTERVAL = 2910
const RECRUIT_CHANCE = 0.0015
const MAX_HAMMERMEN = 10

export class CreatureHammermanSystem {
  private hammermen: Hammerman[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.hammermen.length < MAX_HAMMERMEN && Math.random() < RECRUIT_CHANCE) {
      this.hammermen.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        hammeringSkill: 10 + Math.random() * 25,
        rhythmControl: 15 + Math.random() * 20,
        strikeForce: 5 + Math.random() * 20,
        metalShaping: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const h of this.hammermen) {
      h.hammeringSkill = Math.min(100, h.hammeringSkill + 0.02)
      h.rhythmControl = Math.min(100, h.rhythmControl + 0.015)
      h.metalShaping = Math.min(100, h.metalShaping + 0.01)
    }

    this.hammermen = this.hammermen.filter(h => h.hammeringSkill > 4)
  }

  getHammermen(): Hammerman[] { return this.hammermen }
}
