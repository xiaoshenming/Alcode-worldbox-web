// Diplomatic Extradition System (v3.190) - Civilizations request extradition of fugitives
// Compliance depends on diplomatic relations; refusal increases tension

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ExtraditionCrime = 'theft' | 'treason' | 'murder' | 'espionage'

export interface ExtraditionRequest {
  id: number
  requestingCivId: number
  targetCivId: number
  fugitiveId: number
  crime: ExtraditionCrime
  compliance: number
  tension: number
  tick: number
}

const CHECK_INTERVAL = 4800
const REQUEST_CHANCE = 0.003
const MAX_REQUESTS = 12

const CRIMES: ExtraditionCrime[] = ['theft', 'treason', 'murder', 'espionage']

export class DiplomaticExtraditionSystem {
  private requests: ExtraditionRequest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Attempt to create new extradition requests
    if (this.requests.length < MAX_REQUESTS && Math.random() < REQUEST_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 3) {
        const reqCiv = entities[Math.floor(Math.random() * entities.length)]
        const tgtCiv = entities[Math.floor(Math.random() * entities.length)]
        const fugitive = entities[Math.floor(Math.random() * entities.length)]
        if (reqCiv !== tgtCiv && reqCiv !== fugitive && tgtCiv !== fugitive) {
          if (!this.requests.some(r =>
            r.requestingCivId === reqCiv && r.fugitiveId === fugitive
          )) {
            const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)]
            this.requests.push({
              id: this.nextId++,
              requestingCivId: reqCiv,
              targetCivId: tgtCiv,
              fugitiveId: fugitive,
              crime,
              compliance: 20 + Math.random() * 50,
              tension: 10 + Math.random() * 30,
              tick,
            })
          }
        }
      }
    }

    // Process ongoing requests
    for (const r of this.requests) {
      // Compliance negotiation fluctuates
      r.compliance = Math.max(0, Math.min(100, r.compliance + (Math.random() - 0.4) * 4))

      // Tension rises when compliance is low
      if (r.compliance < 30) {
        r.tension = Math.min(100, r.tension + 2)
      } else {
        r.tension = Math.max(0, r.tension - 1)
      }
    }

    // Resolve completed or collapsed requests
    for (let i = this.requests.length - 1; i >= 0; i--) {
      const r = this.requests[i]
      if (r.compliance >= 95 || r.tension >= 100 || tick - r.tick > 50000) {
        this.requests.splice(i, 1)
      }
    }
  }

  getRequests(): readonly ExtraditionRequest[] { return this.requests }
}
