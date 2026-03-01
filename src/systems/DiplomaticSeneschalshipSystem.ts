// Diplomatic Seneschalship System (v3.571) - Seneschal governance
// Senior stewards managing estates and judicial affairs between realms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SeneschalshipForm = 'royal_seneschalship' | 'ducal_seneschalship' | 'baronial_seneschalship' | 'palatine_seneschalship'

export interface SeneschalshipArrangement {
  id: number
  lordCivId: number
  seneschalCivId: number
  form: SeneschalshipForm
  judicialAuthority: number
  estateManagement: number
  militaryOversight: number
  revenueCollection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2620
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: SeneschalshipForm[] = ['royal_seneschalship', 'ducal_seneschalship', 'baronial_seneschalship', 'palatine_seneschalship']

export class DiplomaticSeneschalshipSystem {
  private arrangements: SeneschalshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const lord = 1 + Math.floor(Math.random() * 8)
      const seneschal = 1 + Math.floor(Math.random() * 8)
      if (lord === seneschal) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        lordCivId: lord,
        seneschalCivId: seneschal,
        form,
        judicialAuthority: 20 + Math.random() * 40,
        estateManagement: 25 + Math.random() * 35,
        militaryOversight: 10 + Math.random() * 30,
        revenueCollection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.judicialAuthority = Math.max(5, Math.min(85, a.judicialAuthority + (Math.random() - 0.48) * 0.12))
      a.estateManagement = Math.max(10, Math.min(90, a.estateManagement + (Math.random() - 0.5) * 0.11))
      a.militaryOversight = Math.max(5, Math.min(80, a.militaryOversight + (Math.random() - 0.42) * 0.13))
      a.revenueCollection = Math.max(5, Math.min(65, a.revenueCollection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
