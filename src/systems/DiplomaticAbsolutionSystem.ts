// Diplomatic Absolution System (v3.382) - Absolution declarations
// Formal release from guilt, obligation, or punishment between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AbsolutionForm = 'war_guilt_release' | 'debt_forgiveness' | 'crime_pardon' | 'oath_release'

export interface AbsolutionDeclaration {
  id: number
  civIdA: number
  civIdB: number
  form: AbsolutionForm
  sincerity: number
  healingEffect: number
  politicalCost: number
  moralAuthority: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2420
const DECLARE_CHANCE = 0.0025
const MAX_DECLARATIONS = 20

const FORMS: AbsolutionForm[] = ['war_guilt_release', 'debt_forgiveness', 'crime_pardon', 'oath_release']

export class DiplomaticAbsolutionSystem {
  private declarations: AbsolutionDeclaration[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.declarations.length < MAX_DECLARATIONS && Math.random() < DECLARE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.declarations.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        sincerity: 25 + Math.random() * 40,
        healingEffect: 20 + Math.random() * 35,
        politicalCost: 10 + Math.random() * 30,
        moralAuthority: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const d of this.declarations) {
      d.duration += 1
      d.sincerity = Math.max(10, Math.min(85, d.sincerity + (Math.random() - 0.47) * 0.11))
      d.healingEffect = Math.max(10, Math.min(80, d.healingEffect + (Math.random() - 0.5) * 0.13))
      d.politicalCost = Math.max(5, Math.min(70, d.politicalCost + (Math.random() - 0.46) * 0.10))
      d.moralAuthority = Math.max(5, Math.min(65, d.moralAuthority + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 84000
    for (let i = this.declarations.length - 1; i >= 0; i--) {
      if (this.declarations[i].tick < cutoff) this.declarations.splice(i, 1)
    }
  }

}
