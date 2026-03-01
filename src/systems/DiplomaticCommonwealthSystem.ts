// Diplomatic Commonwealth System (v3.505) - Commonwealth unions
// Voluntary associations of civilizations for mutual benefit and cooperation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CommonwealthForm = 'economic_commonwealth' | 'cultural_commonwealth' | 'security_commonwealth' | 'scientific_commonwealth'

export interface CommonwealthUnion {
  id: number
  civIdA: number
  civIdB: number
  form: CommonwealthForm
  cooperationLevel: number
  sharedValues: number
  institutionalStrength: number
  memberBenefit: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2470
const PROCEED_CHANCE = 0.0023
const MAX_UNIONS = 18

const FORMS: CommonwealthForm[] = ['economic_commonwealth', 'cultural_commonwealth', 'security_commonwealth', 'scientific_commonwealth']

export class DiplomaticCommonwealthSystem {
  private unions: CommonwealthUnion[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.unions.length < MAX_UNIONS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.unions.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        cooperationLevel: 25 + Math.random() * 40,
        sharedValues: 20 + Math.random() * 35,
        institutionalStrength: 15 + Math.random() * 30,
        memberBenefit: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const u of this.unions) {
      u.duration += 1
      u.cooperationLevel = Math.max(10, Math.min(90, u.cooperationLevel + (Math.random() - 0.47) * 0.12))
      u.sharedValues = Math.max(10, Math.min(85, u.sharedValues + (Math.random() - 0.5) * 0.11))
      u.institutionalStrength = Math.max(5, Math.min(75, u.institutionalStrength + (Math.random() - 0.45) * 0.10))
      u.memberBenefit = Math.max(5, Math.min(65, u.memberBenefit + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 97000
    for (let i = this.unions.length - 1; i >= 0; i--) {
      if (this.unions[i].tick < cutoff) this.unions.splice(i, 1)
    }
  }

}
