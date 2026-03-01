// Creature Oracle System (v3.137) - Oracles foresee future events
// Oracles gain accuracy and followers over time

import { EntityManager } from '../ecs/Entity'

export type OracleDomain = 'weather' | 'war' | 'prosperity' | 'disaster'

export interface OracleData {
  entityId: number
  visionCount: number
  accuracy: number
  domain: OracleDomain
  followers: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3200
const ASSIGN_CHANCE = 0.002
const MAX_ORACLES = 6

const DOMAINS: OracleDomain[] = ['weather', 'war', 'prosperity', 'disaster']
const DOMAIN_BASE_ACCURACY: Record<OracleDomain, number> = {
  weather: 40, war: 25, prosperity: 35, disaster: 20,
}

export class CreatureOracleSystem {
  private oracles: OracleData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.oracles.length < MAX_ORACLES && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)]
        this.oracles.push({
          entityId: eid,
          visionCount: 0,
          accuracy: DOMAIN_BASE_ACCURACY[domain],
          domain,
          followers: 1 + Math.floor(Math.random() * 3),
          active: true,
          tick,
        })
      }
    }

    for (const o of this.oracles) {
      // Oracles periodically receive visions
      if (Math.random() < 0.015) {
        o.visionCount++
        o.accuracy = Math.min(95, o.accuracy + 0.3)
        o.followers = Math.min(50, o.followers + Math.floor(Math.random() * 2))
      }
      // Failed prophecies lose followers
      if (Math.random() < 0.003) {
        o.followers = Math.max(0, o.followers - 1)
        o.accuracy = Math.max(5, o.accuracy - 1)
      }
      if (o.followers <= 0 && Math.random() < 0.01) o.active = false
    }

    for (let i = this.oracles.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.oracles[i].entityId, 'creature') || !this.oracles[i].active) {
        this.oracles.splice(i, 1)
      }
    }
  }

}
