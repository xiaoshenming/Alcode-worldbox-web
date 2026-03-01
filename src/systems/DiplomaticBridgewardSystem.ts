// Diplomatic Bridgeward System (v3.735) - Bridgeward crossing governance
// Wardens overseeing bridge crossings and managing toll agreements between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BridgewardForm = 'royal_bridgeward' | 'stone_bridgeward' | 'river_bridgeward' | 'frontier_bridgeward'

export interface BridgewardArrangement {
  id: number
  enforcingCivId: number
  subjectCivId: number
  form: BridgewardForm
  crossingAuthority: number
  tollCollection: number
  structuralOversight: number
  passageRegulation: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3132
const PROCEED_CHANCE = 0.0024
const MAX_ARRANGEMENTS = 19

const FORMS: BridgewardForm[] = ['royal_bridgeward', 'stone_bridgeward', 'river_bridgeward', 'frontier_bridgeward']

export class DiplomaticBridgewardSystem {
  private arrangements: BridgewardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const enforcing = 1 + Math.floor(Math.random() * 8)
      const subject = 1 + Math.floor(Math.random() * 8)
      if (enforcing === subject) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        enforcingCivId: enforcing,
        subjectCivId: subject,
        form,
        crossingAuthority: 26 + Math.random() * 34,
        tollCollection: 20 + Math.random() * 40,
        structuralOversight: 16 + Math.random() * 24,
        passageRegulation: 14 + Math.random() * 26,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.crossingAuthority = Math.max(5, Math.min(85, a.crossingAuthority + (Math.random() - 0.45) * 0.15))
      a.tollCollection = Math.max(10, Math.min(90, a.tollCollection + (Math.random() - 0.5) * 0.13))
      a.structuralOversight = Math.max(5, Math.min(80, a.structuralOversight + (Math.random() - 0.41) * 0.10))
      a.passageRegulation = Math.max(5, Math.min(65, a.passageRegulation + (Math.random() - 0.48) * 0.11))
    }

    const cutoff = tick - 91000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
