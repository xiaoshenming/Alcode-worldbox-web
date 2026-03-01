// Diplomatic Rehabilitation System (v3.418) - Rehabilitation diplomacy
// Restoration of diplomatic standing and reputation after conflicts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RehabilitationForm = 'reputation_restoration' | 'trust_rebuilding' | 'status_recovery' | 'honor_reclamation'

export interface RehabilitationProcess {
  id: number
  civIdA: number
  civIdB: number
  form: RehabilitationForm
  progressRate: number
  trustLevel: number
  publicPerception: number
  institutionalSupport: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2470
const PROCEED_CHANCE = 0.0023
const MAX_PROCESSES = 20

const FORMS: RehabilitationForm[] = ['reputation_restoration', 'trust_rebuilding', 'status_recovery', 'honor_reclamation']

export class DiplomaticRehabilitationSystem {
  private processes: RehabilitationProcess[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.processes.length < MAX_PROCESSES && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.processes.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        progressRate: 20 + Math.random() * 35,
        trustLevel: 15 + Math.random() * 30,
        publicPerception: 20 + Math.random() * 35,
        institutionalSupport: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration += 1
      p.progressRate = Math.max(10, Math.min(85, p.progressRate + (Math.random() - 0.46) * 0.12))
      p.trustLevel = Math.max(5, Math.min(80, p.trustLevel + (Math.random() - 0.48) * 0.11))
      p.publicPerception = Math.max(10, Math.min(85, p.publicPerception + (Math.random() - 0.47) * 0.10))
      p.institutionalSupport = Math.max(5, Math.min(70, p.institutionalSupport + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.processes.length - 1; i >= 0; i--) {
      if (this.processes[i].tick < cutoff) this.processes.splice(i, 1)
    }
  }

}
