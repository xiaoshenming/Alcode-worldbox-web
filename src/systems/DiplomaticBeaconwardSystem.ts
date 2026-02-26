// Diplomatic Beaconward System (v3.733) - Beaconward signal diplomacy
// Wardens responsible for maintaining signal beacons and coordinating inter-kingdom communications

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BeaconwardForm = 'royal_beaconward' | 'coastal_beaconward' | 'highland_beaconward' | 'border_beaconward'

export interface BeaconwardArrangement {
  id: number
  enforcingCivId: number
  subjectCivId: number
  form: BeaconwardForm
  signalAuthority: number
  beaconMaintenance: number
  communicationReach: number
  warningEfficiency: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3105
const PROCEED_CHANCE = 0.0022
const MAX_ARRANGEMENTS = 17

const FORMS: BeaconwardForm[] = ['royal_beaconward', 'coastal_beaconward', 'highland_beaconward', 'border_beaconward']

export class DiplomaticBeaconwardSystem {
  private arrangements: BeaconwardArrangement[] = []
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
        signalAuthority: 22 + Math.random() * 38,
        beaconMaintenance: 24 + Math.random() * 36,
        communicationReach: 12 + Math.random() * 28,
        warningEfficiency: 16 + Math.random() * 24,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.signalAuthority = Math.max(5, Math.min(85, a.signalAuthority + (Math.random() - 0.47) * 0.13))
      a.beaconMaintenance = Math.max(10, Math.min(90, a.beaconMaintenance + (Math.random() - 0.5) * 0.10))
      a.communicationReach = Math.max(5, Math.min(80, a.communicationReach + (Math.random() - 0.43) * 0.12))
      a.warningEfficiency = Math.max(5, Math.min(65, a.warningEfficiency + (Math.random() - 0.45) * 0.10))
    }

    const cutoff = tick - 89000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BeaconwardArrangement[] { return this.arrangements }
}
