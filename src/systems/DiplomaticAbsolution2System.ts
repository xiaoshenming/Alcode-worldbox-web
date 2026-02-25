// Diplomatic Absolution System (v3.433) - Absolution diplomacy
// Formal release from guilt or obligation between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type Absolution2Form = 'debt_forgiveness' | 'war_guilt_release' | 'treaty_obligation_waiver' | 'reparation_cancellation'

export interface Absolution2Decree {
  id: number
  civIdA: number
  civIdB: number
  form: Absolution2Form
  releaseCompleteness: number
  publicAcceptance: number
  moralAuthority: number
  precedentValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2460
const PROCEED_CHANCE = 0.0023
const MAX_DECREES = 20

const FORMS: Absolution2Form[] = ['debt_forgiveness', 'war_guilt_release', 'treaty_obligation_waiver', 'reparation_cancellation']

export class DiplomaticAbsolution2System {
  private decrees: Absolution2Decree[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.decrees.length < MAX_DECREES && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.decrees.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        releaseCompleteness: 20 + Math.random() * 35,
        publicAcceptance: 15 + Math.random() * 30,
        moralAuthority: 20 + Math.random() * 30,
        precedentValue: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const d of this.decrees) {
      d.duration += 1
      d.releaseCompleteness = Math.max(10, Math.min(90, d.releaseCompleteness + (Math.random() - 0.46) * 0.12))
      d.publicAcceptance = Math.max(5, Math.min(80, d.publicAcceptance + (Math.random() - 0.48) * 0.11))
      d.moralAuthority = Math.max(10, Math.min(85, d.moralAuthority + (Math.random() - 0.47) * 0.10))
      d.precedentValue = Math.max(5, Math.min(65, d.precedentValue + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 86000
    for (let i = this.decrees.length - 1; i >= 0; i--) {
      if (this.decrees[i].tick < cutoff) this.decrees.splice(i, 1)
    }
  }

  getDecrees(): Absolution2Decree[] { return this.decrees }
}
