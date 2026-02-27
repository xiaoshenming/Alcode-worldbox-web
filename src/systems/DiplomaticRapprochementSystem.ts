// Diplomatic Rapprochement System (v3.472) - Rapprochement diplomacy
// Restoration of cordial relations between previously hostile civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RapprochementStage = 'overture' | 'dialogue' | 'warming' | 'normalized'

export interface RapprochementProcess {
  id: number
  civIdA: number
  civIdB: number
  stage: RapprochementStage
  warmth: number
  diplomaticCapital: number
  publicPerception: number
  tradeResumption: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2580
const INITIATE_CHANCE = 0.0017
const MAX_PROCESSES = 14

export class DiplomaticRapprochementSystem {
  private processes: RapprochementProcess[] = []
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
        stage: 'overture',
        warmth: 5 + Math.random() * 15,
        diplomaticCapital: 10 + Math.random() * 20,
        publicPerception: 20 + Math.random() * 30,
        tradeResumption: 0,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration++
      p.warmth = Math.min(100, p.warmth + 0.03)
      p.diplomaticCapital = Math.min(100, p.diplomaticCapital + 0.02)
      if (p.stage === 'overture' && p.warmth > 25) p.stage = 'dialogue'
      if (p.stage === 'dialogue' && p.warmth > 50) p.stage = 'warming'
      if (p.stage === 'warming' && p.warmth > 80) {
        p.stage = 'normalized'
        p.tradeResumption = 50 + Math.random() * 50
      }
    }

    for (let _i = this.processes.length - 1; _i >= 0; _i--) { if (!((p) => p.stage !== 'normalized' || p.duration < 120)(this.processes[_i])) this.processes.splice(_i, 1) }
  }

  getProcesses(): RapprochementProcess[] { return this.processes }
}
