// Creature Runner System (v3.125) - Long-distance messengers for fast communication
// Runners carry messages between settlements at high speed

import { EntityManager } from '../ecs/Entity'

export type RunnerEndurance = 'novice' | 'trained' | 'elite' | 'legendary'

export interface Runner {
  id: number
  creatureId: number
  endurance: RunnerEndurance
  speed: number
  messagesDelivered: number
  stamina: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 2400
const RECRUIT_CHANCE = 0.004
const MAX_RUNNERS = 22

const ENDURANCES: RunnerEndurance[] = ['novice', 'trained', 'elite', 'legendary']
const END_SPEED: Record<RunnerEndurance, number> = {
  novice: 3, trained: 6, elite: 10, legendary: 16,
}

export class CreatureRunnerSystem {
  private runners: Runner[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.runners.length < MAX_RUNNERS && Math.random() < RECRUIT_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const endurance = ENDURANCES[Math.floor(Math.random() * ENDURANCES.length)]
        this.runners.push({
          id: this.nextId++,
          creatureId: eid,
          endurance,
          speed: END_SPEED[endurance],
          messagesDelivered: 0,
          stamina: 60 + Math.floor(Math.random() * 40),
          reputation: 0,
          tick,
        })
      }
    }

    for (const r of this.runners) {
      // Deliver messages
      if (Math.random() < 0.02) {
        r.messagesDelivered++
        r.stamina = Math.max(10, r.stamina - 2)
        r.reputation = Math.min(100, r.reputation + 0.3)
      }
      // Rest and recover stamina
      if (r.stamina < 30 && Math.random() < 0.05) {
        r.stamina = Math.min(100, r.stamina + 10)
      }
      // Promotion
      if (r.messagesDelivered > 80 && r.endurance === 'novice') {
        r.endurance = 'trained'
        r.speed = END_SPEED.trained
      } else if (r.messagesDelivered > 200 && r.endurance === 'trained') {
        r.endurance = 'elite'
        r.speed = END_SPEED.elite
      }
    }

    for (let i = this.runners.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.runners[i].creatureId, 'creature')) this.runners.splice(i, 1)
    }
  }

  getRunners(): readonly Runner[] { return this.runners }
}
