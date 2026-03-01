// Diplomatic Conciliation System (v3.451) - Conciliation diplomacy
// Peaceful resolution of disputes through mutual concessions and goodwill

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConciliationPhase = 'proposal' | 'negotiation' | 'resolution' | 'collapsed'

export interface ConciliationProcess {
  id: number
  civIdA: number
  civIdB: number
  phase: ConciliationPhase
  goodwillA: number
  goodwillB: number
  concessionsExchanged: number
  stabilityGain: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const INITIATE_CHANCE = 0.002
const MAX_PROCESSES = 16

export class DiplomaticConciliationSystem {
  private processes: ConciliationProcess[] = []
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
        phase: 'proposal',
        goodwillA: 15 + Math.random() * 30,
        goodwillB: 15 + Math.random() * 30,
        concessionsExchanged: 0,
        stabilityGain: 0,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration++
      p.goodwillA = Math.min(100, p.goodwillA + 0.03)
      p.goodwillB = Math.min(100, p.goodwillB + 0.025)
      if (p.phase === 'proposal' && p.goodwillA > 40) p.phase = 'negotiation'
      if (p.phase === 'negotiation' && p.goodwillB > 55) {
        p.phase = 'resolution'
        p.concessionsExchanged++
        p.stabilityGain += 5
      }
      if (p.goodwillA < 10 || p.goodwillB < 10) p.phase = 'collapsed'
    }

    for (let _i = this.processes.length - 1; _i >= 0; _i--) { if (!((p) => p.phase !== 'collapsed' && p.duration < 200)(this.processes[_i])) this.processes.splice(_i, 1) }
  }

}
