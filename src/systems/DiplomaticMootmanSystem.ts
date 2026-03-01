// Diplomatic Mootman System (v3.676) - Mootman governance
// Officers presiding over local assemblies and judicial meetings between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MootmanForm = 'royal_mootman' | 'shire_mootman' | 'hundred_mootman' | 'borough_mootman'

export interface MootmanArrangement {
  id: number
  assemblyCivId: number
  judicialCivId: number
  form: MootmanForm
  assemblyAuthority: number
  judicialPower: number
  disputeResolution: number
  communalOrder: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2890
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: MootmanForm[] = ['royal_mootman', 'shire_mootman', 'hundred_mootman', 'borough_mootman']

export class DiplomaticMootmanSystem {
  private arrangements: MootmanArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const assembly = 1 + Math.floor(Math.random() * 8)
      const judicial = 1 + Math.floor(Math.random() * 8)
      if (assembly === judicial) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        assemblyCivId: assembly,
        judicialCivId: judicial,
        form,
        assemblyAuthority: 20 + Math.random() * 40,
        judicialPower: 25 + Math.random() * 35,
        disputeResolution: 10 + Math.random() * 30,
        communalOrder: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.assemblyAuthority = Math.max(5, Math.min(85, a.assemblyAuthority + (Math.random() - 0.48) * 0.12))
      a.judicialPower = Math.max(10, Math.min(90, a.judicialPower + (Math.random() - 0.5) * 0.11))
      a.disputeResolution = Math.max(5, Math.min(80, a.disputeResolution + (Math.random() - 0.42) * 0.13))
      a.communalOrder = Math.max(5, Math.min(65, a.communalOrder + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
