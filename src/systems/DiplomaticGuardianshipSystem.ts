// Diplomatic Guardianship System (v3.544) - Guardianship protection pacts
// Stronger civilizations assuming protective guardianship over weaker ones

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GuardianshipForm = 'military_guardianship' | 'economic_guardianship' | 'cultural_guardianship' | 'territorial_guardianship'

export interface GuardianshipArrangement {
  id: number
  guardianCivId: number
  protectedCivId: number
  form: GuardianshipForm
  protectionStrength: number
  dependencyLevel: number
  autonomyPreserved: number
  stabilityBonus: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2570
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: GuardianshipForm[] = ['military_guardianship', 'economic_guardianship', 'cultural_guardianship', 'territorial_guardianship']

export class DiplomaticGuardianshipSystem {
  private arrangements: GuardianshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const guardian = 1 + Math.floor(Math.random() * 8)
      const protected_ = 1 + Math.floor(Math.random() * 8)
      if (guardian === protected_) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        guardianCivId: guardian,
        protectedCivId: protected_,
        form,
        protectionStrength: 20 + Math.random() * 40,
        dependencyLevel: 25 + Math.random() * 35,
        autonomyPreserved: 10 + Math.random() * 30,
        stabilityBonus: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.protectionStrength = Math.max(5, Math.min(85, a.protectionStrength + (Math.random() - 0.48) * 0.12))
      a.dependencyLevel = Math.max(10, Math.min(90, a.dependencyLevel + (Math.random() - 0.5) * 0.11))
      a.autonomyPreserved = Math.max(5, Math.min(80, a.autonomyPreserved + (Math.random() - 0.42) * 0.13))
      a.stabilityBonus = Math.max(5, Math.min(65, a.stabilityBonus + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
