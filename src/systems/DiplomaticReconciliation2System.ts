// Diplomatic Reconciliation 2 System (v3.457) - Advanced reconciliation diplomacy
// Deep reconciliation processes addressing historical grievances between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReconciliationStage = 'acknowledgment' | 'dialogue' | 'healing' | 'renewed'

export interface ReconciliationProcess2 {
  id: number
  civIdA: number
  civIdB: number
  stage: ReconciliationStage
  grievanceResolved: number
  mutualRespect: number
  culturalExchange: number
  publicSupport: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2600
const INITIATE_CHANCE = 0.0018
const MAX_PROCESSES = 14

export class DiplomaticReconciliation2System {
  private processes: ReconciliationProcess2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.processes.length < MAX_PROCESSES && Math.random() < INITIATE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      if (a === b) return

      this.processes.push({
        id: this.nextId++,
        civIdA: a,
        civIdB: b,
        stage: 'acknowledgment',
        grievanceResolved: 0,
        mutualRespect: 10 + Math.random() * 20,
        culturalExchange: 5 + Math.random() * 15,
        publicSupport: 20 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration++
      p.mutualRespect = Math.min(100, p.mutualRespect + 0.03)
      p.culturalExchange = Math.min(100, p.culturalExchange + 0.02)
      if (p.stage === 'acknowledgment' && p.mutualRespect > 35) p.stage = 'dialogue'
      if (p.stage === 'dialogue' && p.culturalExchange > 40) p.stage = 'healing'
      if (p.stage === 'healing' && p.mutualRespect > 70) {
        p.stage = 'renewed'
        p.grievanceResolved++
      }
    }

    for (let _i = this.processes.length - 1; _i >= 0; _i--) { if (!((p) => p.stage !== 'renewed' || p.duration < 100)(this.processes[_i])) this.processes.splice(_i, 1) }
  }

}
