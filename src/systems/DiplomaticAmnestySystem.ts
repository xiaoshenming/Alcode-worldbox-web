// Diplomatic Amnesty System (v3.328) - Amnesty agreements
// Pardons and forgiveness for past conflicts to enable fresh diplomatic starts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AmnestyScope = 'political' | 'military' | 'economic' | 'universal'

export interface AmnestyAgreement {
  id: number
  civIdA: number
  civIdB: number
  scope: AmnestyScope
  pardonLevel: number
  trustRestoration: number
  publicSupport: number
  reconciliationProgress: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2400
const TREATY_CHANCE = 0.0026
const MAX_TREATIES = 20

const SCOPES: AmnestyScope[] = ['political', 'military', 'economic', 'universal']

export class DiplomaticAmnestySystem {
  private treaties: AmnestyAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const scope = SCOPES[Math.floor(Math.random() * SCOPES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        scope,
        pardonLevel: 15 + Math.random() * 35,
        trustRestoration: 10 + Math.random() * 30,
        publicSupport: 30 + Math.random() * 40,
        reconciliationProgress: 5 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.pardonLevel = Math.max(5, Math.min(85, treaty.pardonLevel + (Math.random() - 0.45) * 0.12))
      treaty.trustRestoration = Math.max(5, Math.min(80, treaty.trustRestoration + (Math.random() - 0.46) * 0.11))
      treaty.publicSupport = Math.max(10, Math.min(95, treaty.publicSupport + (Math.random() - 0.48) * 0.13))
      treaty.reconciliationProgress = Math.max(2, Math.min(70, treaty.reconciliationProgress + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 82000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): AmnestyAgreement[] { return this.treaties }
}
