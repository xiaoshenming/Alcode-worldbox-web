// Diplomatic Reprieve System (v3.388) - Reprieve grants
// Temporary relief or postponement of punishment between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReprieveForm = 'execution_delay' | 'sanction_pause' | 'tribute_deferral' | 'siege_suspension'

export interface ReprieveGrant {
  id: number
  civIdA: number
  civIdB: number
  form: ReprieveForm
  reliefLevel: number
  timeGained: number
  goodwillEffect: number
  conditionalTerms: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2380
const GRANT_CHANCE = 0.0026
const MAX_GRANTS = 20

const FORMS: ReprieveForm[] = ['execution_delay', 'sanction_pause', 'tribute_deferral', 'siege_suspension']

export class DiplomaticReprieveSystem {
  private grants: ReprieveGrant[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.grants.length < MAX_GRANTS && Math.random() < GRANT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.grants.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        reliefLevel: 25 + Math.random() * 40,
        timeGained: 20 + Math.random() * 35,
        goodwillEffect: 15 + Math.random() * 30,
        conditionalTerms: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const g of this.grants) {
      g.duration += 1
      g.reliefLevel = Math.max(10, Math.min(85, g.reliefLevel + (Math.random() - 0.47) * 0.12))
      g.timeGained = Math.max(10, Math.min(80, g.timeGained - 0.002))
      g.goodwillEffect = Math.max(5, Math.min(75, g.goodwillEffect + (Math.random() - 0.45) * 0.11))
      g.conditionalTerms = Math.max(5, Math.min(65, g.conditionalTerms + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 84000
    for (let i = this.grants.length - 1; i >= 0; i--) {
      if (this.grants[i].tick < cutoff) this.grants.splice(i, 1)
    }
  }

  getGrants(): ReprieveGrant[] { return this.grants }
}
