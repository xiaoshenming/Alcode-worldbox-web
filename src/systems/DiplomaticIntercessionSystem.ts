// Diplomatic Intercession System (v3.460) - Intercession diplomacy
// Civilizations intervening on behalf of allies in diplomatic disputes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type IntercessionResult = 'active' | 'successful' | 'rejected' | 'withdrawn'

export interface IntercessionAction {
  id: number
  intercessorCivId: number
  beneficiaryCivId: number
  opponentCivId: number
  result: IntercessionResult
  influence: number
  allianceStrength: number
  diplomaticCost: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2570
const INITIATE_CHANCE = 0.0017
const MAX_ACTIONS = 15

export class DiplomaticIntercessionSystem {
  private actions: IntercessionAction[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.actions.length < MAX_ACTIONS && Math.random() < INITIATE_CHANCE) {
      const intercessor = 1 + Math.floor(Math.random() * 8)
      const beneficiary = 1 + Math.floor(Math.random() * 8)
      const opponent = 1 + Math.floor(Math.random() * 8)
      if (intercessor === beneficiary || intercessor === opponent || beneficiary === opponent) return

      this.actions.push({
        id: this.nextId++,
        intercessorCivId: intercessor,
        beneficiaryCivId: beneficiary,
        opponentCivId: opponent,
        result: 'active',
        influence: 15 + Math.random() * 35,
        allianceStrength: 20 + Math.random() * 30,
        diplomaticCost: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.actions) {
      a.duration++
      a.influence = Math.min(100, a.influence + 0.02)
      a.diplomaticCost = Math.min(100, a.diplomaticCost + 0.01)
      if (a.influence > 70 && Math.random() < 0.04) a.result = 'successful'
      if (a.diplomaticCost > 80 && Math.random() < 0.03) a.result = 'withdrawn'
      if (a.influence < 20 && a.duration > 50) a.result = 'rejected'
    }

    for (let _i = this.actions.length - 1; _i >= 0; _i--) { if (!((a) => a.result === 'active')(this.actions[_i])) this.actions.splice(_i, 1) }
  }

  getActions(): IntercessionAction[] { return this.actions }
}
