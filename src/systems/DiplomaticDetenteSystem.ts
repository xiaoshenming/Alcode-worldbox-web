// Diplomatic Detente System (v3.334) - Detente agreements
// Easing of strained relations through mutual concessions and dialogue

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DetentePhase = 'initial' | 'negotiation' | 'implementation' | 'normalization'

export interface DetenteAgreement {
  id: number
  civIdA: number
  civIdB: number
  phase: DetentePhase
  tensionReduction: number
  diplomaticChannels: number
  tradeOpening: number
  culturalExchange: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2420
const TREATY_CHANCE = 0.0025
const MAX_TREATIES = 20

const PHASES: DetentePhase[] = ['initial', 'negotiation', 'implementation', 'normalization']

export class DiplomaticDetenteSystem {
  private treaties: DetenteAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const phase = PHASES[Math.floor(Math.random() * PHASES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        phase,
        tensionReduction: 10 + Math.random() * 30,
        diplomaticChannels: 1 + Math.floor(Math.random() * 5),
        tradeOpening: 5 + Math.random() * 25,
        culturalExchange: 8 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.tensionReduction = Math.max(5, Math.min(80, treaty.tensionReduction + (Math.random() - 0.45) * 0.13))
      treaty.tradeOpening = Math.max(3, Math.min(70, treaty.tradeOpening + (Math.random() - 0.46) * 0.1))
      treaty.culturalExchange = Math.max(3, Math.min(60, treaty.culturalExchange + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 83000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

}
