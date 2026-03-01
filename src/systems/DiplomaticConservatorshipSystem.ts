// Diplomatic Conservatorship System (v3.553) - Conservatorship governance
// Civilizations assuming conservatorial control over failing states

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConservatorshipForm = 'fiscal_conservatorship' | 'military_conservatorship' | 'administrative_conservatorship' | 'judicial_conservatorship'

export interface ConservatorshipArrangement {
  id: number
  conservatorCivId: number
  subjectCivId: number
  form: ConservatorshipForm
  controlScope: number
  reformProgress: number
  resistanceLevel: number
  stabilityGain: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ConservatorshipForm[] = ['fiscal_conservatorship', 'military_conservatorship', 'administrative_conservatorship', 'judicial_conservatorship']

export class DiplomaticConservatorshipSystem {
  private arrangements: ConservatorshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const conservator = 1 + Math.floor(Math.random() * 8)
      const subject = 1 + Math.floor(Math.random() * 8)
      if (conservator === subject) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        conservatorCivId: conservator,
        subjectCivId: subject,
        form,
        controlScope: 20 + Math.random() * 40,
        reformProgress: 25 + Math.random() * 35,
        resistanceLevel: 10 + Math.random() * 30,
        stabilityGain: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.controlScope = Math.max(5, Math.min(85, a.controlScope + (Math.random() - 0.48) * 0.12))
      a.reformProgress = Math.max(10, Math.min(90, a.reformProgress + (Math.random() - 0.5) * 0.11))
      a.resistanceLevel = Math.max(5, Math.min(80, a.resistanceLevel + (Math.random() - 0.42) * 0.13))
      a.stabilityGain = Math.max(5, Math.min(65, a.stabilityGain + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
