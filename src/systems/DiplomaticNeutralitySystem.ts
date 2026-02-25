// Diplomatic Neutrality System (v3.358) - Neutrality declarations
// Formal declarations of non-involvement in conflicts between other civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type NeutralityScope = 'military' | 'economic' | 'political' | 'comprehensive'

export interface NeutralityDeclaration {
  id: number
  civId: number
  scope: NeutralityScope
  credibility: number
  tradeAccess: number
  diplomaticStanding: number
  vulnerabilityRisk: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2380
const DECLARE_CHANCE = 0.0026
const MAX_DECLARATIONS = 20

const SCOPES: NeutralityScope[] = ['military', 'economic', 'political', 'comprehensive']

export class DiplomaticNeutralitySystem {
  private declarations: NeutralityDeclaration[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.declarations.length < MAX_DECLARATIONS && Math.random() < DECLARE_CHANCE) {
      const civId = 1 + Math.floor(Math.random() * 8)
      const scope = SCOPES[Math.floor(Math.random() * SCOPES.length)]

      this.declarations.push({
        id: this.nextId++,
        civId,
        scope,
        credibility: 20 + Math.random() * 40,
        tradeAccess: 15 + Math.random() * 30,
        diplomaticStanding: 25 + Math.random() * 35,
        vulnerabilityRisk: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const d of this.declarations) {
      d.duration += 1
      d.credibility = Math.max(10, Math.min(90, d.credibility + (Math.random() - 0.46) * 0.12))
      d.tradeAccess = Math.max(5, Math.min(75, d.tradeAccess + (Math.random() - 0.45) * 0.11))
      d.diplomaticStanding = Math.max(10, Math.min(85, d.diplomaticStanding + (Math.random() - 0.47) * 0.1))
      d.vulnerabilityRisk = Math.max(5, Math.min(60, d.vulnerabilityRisk + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 81000
    for (let i = this.declarations.length - 1; i >= 0; i--) {
      if (this.declarations[i].tick < cutoff) this.declarations.splice(i, 1)
    }
  }

  getDeclarations(): NeutralityDeclaration[] { return this.declarations }
}
