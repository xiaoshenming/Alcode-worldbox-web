// Diplomatic Arbitration Treaty System (v3.250) - Binding arbitration agreements
// Civilizations agree in advance to submit future disputes to neutral arbitrators

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TreatyScope = 'trade' | 'border' | 'maritime' | 'comprehensive'

export interface ArbitrationTreaty {
  id: number
  signatory1CivId: number
  signatory2CivId: number
  scope: TreatyScope
  bindingStrength: number
  disputesResolved: number
  compliance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.003
const MAX_TREATIES = 24

const SCOPES: TreatyScope[] = ['trade', 'border', 'maritime', 'comprehensive']

export class DiplomaticArbitrationTreatySystem {
  private treaties: ArbitrationTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const sig1 = 1 + Math.floor(Math.random() * 8)
      const sig2 = 1 + Math.floor(Math.random() * 8)
      if (sig1 === sig2) return

      const scope = SCOPES[Math.floor(Math.random() * SCOPES.length)]

      this.treaties.push({
        id: this.nextId++,
        signatory1CivId: sig1,
        signatory2CivId: sig2,
        scope,
        bindingStrength: 30 + Math.random() * 50,
        disputesResolved: 0,
        compliance: 50 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.bindingStrength = Math.min(100, treaty.bindingStrength + 0.02)
      treaty.compliance = Math.max(20, Math.min(100, treaty.compliance + (Math.random() - 0.45) * 0.1))
      if (Math.random() < 0.005) treaty.disputesResolved += 1
    }

    const cutoff = tick - 80000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

}
