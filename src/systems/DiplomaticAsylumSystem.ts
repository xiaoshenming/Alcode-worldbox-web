// Diplomatic Asylum System (v3.195) - Civilizations grant or deny asylum to refugees
// Asylum decisions affect diplomatic relations and population dynamics

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AsylumReason = 'persecution' | 'war' | 'famine' | 'political'

export interface AsylumRequest {
  id: number
  seekerCivId: number
  hostCivId: number
  refugeeCount: number
  reason: AsylumReason
  approval: number
  diplomaticImpact: number
  tick: number
}

const CHECK_INTERVAL = 5000
const REQUEST_CHANCE = 0.004
const MAX_REQUESTS = 10

const REASONS: AsylumReason[] = ['persecution', 'war', 'famine', 'political']

export class DiplomaticAsylumSystem {
  private requests: AsylumRequest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.requests.length < MAX_REQUESTS && Math.random() < REQUEST_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 3) {
        const seeker = entities[Math.floor(Math.random() * entities.length)]
        const host = entities[Math.floor(Math.random() * entities.length)]
        if (seeker !== host) {
          if (!this.requests.some(r => r.seekerCivId === seeker && r.hostCivId === host)) {
            const reason = REASONS[Math.floor(Math.random() * REASONS.length)]
            this.requests.push({
              id: this.nextId++,
              seekerCivId: seeker,
              hostCivId: host,
              refugeeCount: 5 + Math.floor(Math.random() * 50),
              reason,
              approval: 30 + Math.random() * 40,
              diplomaticImpact: 10 + Math.random() * 25,
              tick,
            })
          }
        }
      }
    }

    for (const r of this.requests) {
      r.approval = Math.max(0, Math.min(100, r.approval + (Math.random() - 0.45) * 5))
      if (r.approval > 70) {
        r.diplomaticImpact = Math.min(100, r.diplomaticImpact + 1.5)
      } else if (r.approval < 30) {
        r.diplomaticImpact = Math.max(-50, r.diplomaticImpact - 2)
      }
    }

    for (let i = this.requests.length - 1; i >= 0; i--) {
      const r = this.requests[i]
      if (r.approval >= 95 || r.approval <= 2 || tick - r.tick > 55000) {
        this.requests.splice(i, 1)
      }
    }
  }

}
