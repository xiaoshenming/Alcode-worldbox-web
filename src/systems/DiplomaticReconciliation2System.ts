// Diplomatic Reconciliation System (v3.427) - Reconciliation diplomacy
// Formal processes of restoring friendly relations after deep conflicts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type Reconciliation2Form = 'truth_commission' | 'joint_memorial' | 'cultural_exchange' | 'shared_governance'

export interface Reconciliation2Process {
  id: number
  civIdA: number
  civIdB: number
  form: Reconciliation2Form
  healingProgress: number
  mutualTrust: number
  publicEngagement: number
  institutionalBacking: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2530
const PROCEED_CHANCE = 0.0022
const MAX_PROCESSES = 20

const FORMS: Reconciliation2Form[] = ['truth_commission', 'joint_memorial', 'cultural_exchange', 'shared_governance']

export class DiplomaticReconciliation2System {
  private processes: Reconciliation2Process[] = []
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
        healingProgress: 15 + Math.random() * 30,
        mutualTrust: 10 + Math.random() * 25,
        publicEngagement: 20 + Math.random() * 35,
        institutionalBacking: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration += 1
      p.healingProgress = Math.max(5, Math.min(90, p.healingProgress + (Math.random() - 0.45) * 0.12))
      p.mutualTrust = Math.max(5, Math.min(80, p.mutualTrust + (Math.random() - 0.47) * 0.11))
      p.publicEngagement = Math.max(10, Math.min(85, p.publicEngagement + (Math.random() - 0.46) * 0.10))
      p.institutionalBacking = Math.max(5, Math.min(70, p.institutionalBacking + (Math.random() - 0.48) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.processes.length - 1; i >= 0; i--) {
      if (this.processes[i].tick < cutoff) this.processes.splice(i, 1)
    }
  }

  getProcesses(): Reconciliation2Process[] { return this.processes }
}
