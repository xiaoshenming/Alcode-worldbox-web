// Creature Jester System (v3.127) - Court jesters boost morale with humor
// Jesters perform in settlements, reducing stress and increasing happiness

import { EntityManager } from '../ecs/Entity'

export type JesterAct = 'juggling' | 'comedy' | 'acrobatics' | 'satire'

export interface Jester {
  id: number
  creatureId: number
  act: JesterAct
  humor: number
  performances: number
  moraleBoost: number
  notoriety: number
  tick: number
}

const CHECK_INTERVAL = 2800
const RECRUIT_CHANCE = 0.003
const MAX_JESTERS = 16

const ACTS: JesterAct[] = ['juggling', 'comedy', 'acrobatics', 'satire']
const ACT_MORALE: Record<JesterAct, number> = {
  juggling: 6, comedy: 10, acrobatics: 8, satire: 14,
}

export class CreatureJesterSystem {
  private jesters: Jester[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.jesters.length < MAX_JESTERS && Math.random() < RECRUIT_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const act = ACTS[Math.floor(Math.random() * ACTS.length)]
        this.jesters.push({
          id: this.nextId++,
          creatureId: eid,
          act,
          humor: 20 + Math.floor(Math.random() * 40),
          performances: 0,
          moraleBoost: ACT_MORALE[act],
          notoriety: 0,
          tick,
        })
      }
    }

    for (const j of this.jesters) {
      if (Math.random() < 0.02) {
        j.performances++
        j.humor = Math.min(100, j.humor + 0.2)
        j.notoriety = Math.min(100, j.notoriety + 0.15)
      }
      // Satire can backfire
      if (j.act === 'satire' && Math.random() < 0.002) {
        j.notoriety = Math.max(0, j.notoriety - 5)
      }
    }

    for (let i = this.jesters.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.jesters[i].creatureId, 'creature')) this.jesters.splice(i, 1)
    }
  }

  getJesters(): readonly Jester[] { return this.jesters }
}
