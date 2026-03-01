// Diplomatic Seneschalry System (v3.613) - Seneschalry governance
// Senior stewards administering estates and judicial matters between realms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SeneschalryForm = 'estate_seneschalry' | 'judicial_seneschalry' | 'fiscal_seneschalry' | 'military_seneschalry'

export interface SeneschalryArrangement {
  id: number
  estateCivId: number
  seneschalCivId: number
  form: SeneschalryForm
  estateManagement: number
  judicialAuthority: number
  fiscalOversight: number
  militaryCommand: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2720
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: SeneschalryForm[] = ['estate_seneschalry', 'judicial_seneschalry', 'fiscal_seneschalry', 'military_seneschalry']

export class DiplomaticSeneschalrySystem {
  private arrangements: SeneschalryArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const estate = 1 + Math.floor(Math.random() * 8)
      const seneschal = 1 + Math.floor(Math.random() * 8)
      if (estate === seneschal) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        estateCivId: estate,
        seneschalCivId: seneschal,
        form,
        estateManagement: 20 + Math.random() * 40,
        judicialAuthority: 25 + Math.random() * 35,
        fiscalOversight: 10 + Math.random() * 30,
        militaryCommand: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.estateManagement = Math.max(5, Math.min(85, a.estateManagement + (Math.random() - 0.48) * 0.12))
      a.judicialAuthority = Math.max(10, Math.min(90, a.judicialAuthority + (Math.random() - 0.5) * 0.11))
      a.fiscalOversight = Math.max(5, Math.min(80, a.fiscalOversight + (Math.random() - 0.42) * 0.13))
      a.militaryCommand = Math.max(5, Math.min(65, a.militaryCommand + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
