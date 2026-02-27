// Creature Astronomer System (v3.158) - Creatures observe celestial bodies
// Astronomers track stars, predict events, and make discoveries over time

import { EntityManager } from '../ecs/Entity'

export type TelescopeType = 'naked_eye' | 'basic' | 'refractor' | 'reflector'

export interface Astronomer {
  id: number
  entityId: number
  observations: number
  accuracy: number
  discoveries: number
  telescope: TelescopeType
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.002
const MAX_ASTRONOMERS = 10

const TELESCOPES: TelescopeType[] = ['naked_eye', 'basic', 'refractor', 'reflector']
const TELESCOPE_POWER: Record<TelescopeType, number> = {
  naked_eye: 10, basic: 30, refractor: 60, reflector: 85,
}

export class CreatureAstronomerSystem {
  private astronomers: Astronomer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Assign new astronomers
    if (this.astronomers.length < MAX_ASTRONOMERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.astronomers.some(a => a.entityId === eid)
        if (!already) {
          const telescope = TELESCOPES[Math.floor(Math.random() * TELESCOPES.length)]
          this.astronomers.push({
            id: this.nextId++,
            entityId: eid,
            observations: 0,
            accuracy: TELESCOPE_POWER[telescope] * (0.5 + Math.random() * 0.5),
            discoveries: 0,
            telescope,
            tick,
          })
        }
      }
    }

    // Astronomers observe the sky and make discoveries
    for (const a of this.astronomers) {
      // Nightly observation attempt
      if (Math.random() < 0.012) {
        a.observations++
        a.accuracy = Math.min(99, a.accuracy + 0.1)

        // Chance of a discovery scales with accuracy and telescope power
        const discoveryChance = (a.accuracy / 100) * 0.03
        if (Math.random() < discoveryChance) {
          a.discoveries++
        }
      }

      // Upgrade telescope with enough observations
      if (a.observations > 50 && a.telescope === 'naked_eye') {
        a.telescope = 'basic'
        a.accuracy = Math.min(99, a.accuracy + 15)
      } else if (a.observations > 150 && a.telescope === 'basic') {
        a.telescope = 'refractor'
        a.accuracy = Math.min(99, a.accuracy + 20)
      } else if (a.observations > 400 && a.telescope === 'refractor') {
        a.telescope = 'reflector'
        a.accuracy = Math.min(99, a.accuracy + 15)
      }
    }

    // Remove astronomers whose creatures no longer exist
    for (let i = this.astronomers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.astronomers[i].entityId, 'creature')) this.astronomers.splice(i, 1)
    }
  }

  getAstronomers(): readonly Astronomer[] { return this.astronomers }
}
