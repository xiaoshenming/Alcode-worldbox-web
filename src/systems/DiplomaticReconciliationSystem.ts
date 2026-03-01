// Diplomatic Reconciliation System (v3.322) - Post-conflict reconciliation
// Processes where former enemies work to heal wounds and rebuild relationships

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReconciliationStage = 'acknowledgment' | 'dialogue' | 'reparation' | 'healing'

export interface ReconciliationProcess {
  id: number
  civIdA: number
  civIdB: number
  stage: ReconciliationStage
  truthProgress: number
  forgiveness: number
  reparationsPaid: number
  communityHealing: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const PROCESS_CHANCE = 0.0025
const MAX_PROCESSES = 18

const STAGES: ReconciliationStage[] = ['acknowledgment', 'dialogue', 'reparation', 'healing']

export class DiplomaticReconciliationSystem {
  private processes: ReconciliationProcess[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.processes.length < MAX_PROCESSES && Math.random() < PROCESS_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const stage = STAGES[Math.floor(Math.random() * STAGES.length)]

      this.processes.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        stage,
        truthProgress: 10 + Math.random() * 30,
        forgiveness: 5 + Math.random() * 25,
        reparationsPaid: Math.random() * 20,
        communityHealing: 10 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const proc of this.processes) {
      proc.duration += 1
      proc.truthProgress = Math.max(5, Math.min(100, proc.truthProgress + (Math.random() - 0.44) * 0.14))
      proc.forgiveness = Math.max(2, Math.min(90, proc.forgiveness + (Math.random() - 0.45) * 0.12))
      proc.reparationsPaid = Math.min(100, proc.reparationsPaid + 0.008)
      proc.communityHealing = Math.max(3, Math.min(85, proc.communityHealing + (Math.random() - 0.43) * 0.11))
    }

    const cutoff = tick - 86000
    for (let i = this.processes.length - 1; i >= 0; i--) {
      if (this.processes[i].tick < cutoff) this.processes.splice(i, 1)
    }
  }

}
