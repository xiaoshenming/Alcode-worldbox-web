// Diplomatic Provostship System (v3.610) - Provost governance
// Provosts overseeing academic, religious, or municipal institutions between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ProvostshipForm = 'academic_provostship' | 'ecclesiastical_provostship' | 'municipal_provostship' | 'military_provostship'

export interface ProvostshipArrangement {
  id: number
  institutionCivId: number
  provostCivId: number
  form: ProvostshipForm
  institutionalAuthority: number
  academicOversight: number
  disciplinaryPower: number
  administrativeReach: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2750
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ProvostshipForm[] = ['academic_provostship', 'ecclesiastical_provostship', 'municipal_provostship', 'military_provostship']

export class DiplomaticProvostshipSystem {
  private arrangements: ProvostshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const institution = 1 + Math.floor(Math.random() * 8)
      const provost = 1 + Math.floor(Math.random() * 8)
      if (institution === provost) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        institutionCivId: institution,
        provostCivId: provost,
        form,
        institutionalAuthority: 20 + Math.random() * 40,
        academicOversight: 25 + Math.random() * 35,
        disciplinaryPower: 10 + Math.random() * 30,
        administrativeReach: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.institutionalAuthority = Math.max(5, Math.min(85, a.institutionalAuthority + (Math.random() - 0.48) * 0.12))
      a.academicOversight = Math.max(10, Math.min(90, a.academicOversight + (Math.random() - 0.5) * 0.11))
      a.disciplinaryPower = Math.max(5, Math.min(80, a.disciplinaryPower + (Math.random() - 0.42) * 0.13))
      a.administrativeReach = Math.max(5, Math.min(65, a.administrativeReach + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): ProvostshipArrangement[] { return this.arrangements }
}
