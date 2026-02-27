// Diplomatic Detente 2 System (v3.469) - Advanced detente diplomacy
// Easing of strained relations through gradual confidence-building measures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DetentePhase2 = 'signaling' | 'confidence_building' | 'normalization' | 'partnership'

export interface DetenteProcess2 {
  id: number
  civIdA: number
  civIdB: number
  phase: DetentePhase2
  tensionReduction: number
  tradeVolume: number
  culturalTies: number
  militaryTransparency: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2610
const INITIATE_CHANCE = 0.0016
const MAX_PROCESSES = 14

export class DiplomaticDetente2System {
  private processes: DetenteProcess2[] = []
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
        phase: 'signaling',
        tensionReduction: 5 + Math.random() * 15,
        tradeVolume: 0,
        culturalTies: 5 + Math.random() * 10,
        militaryTransparency: 0,
        duration: 0,
        tick,
      })
    }

    for (const p of this.processes) {
      p.duration++
      p.tensionReduction = Math.min(100, p.tensionReduction + 0.03)
      p.tradeVolume = Math.min(100, p.tradeVolume + 0.02)
      if (p.phase === 'signaling' && p.tensionReduction > 25) p.phase = 'confidence_building'
      if (p.phase === 'confidence_building' && p.tradeVolume > 30) p.phase = 'normalization'
      if (p.phase === 'normalization' && p.tensionReduction > 70) p.phase = 'partnership'
    }

    for (let _i = this.processes.length - 1; _i >= 0; _i--) { if (!((p) => p.phase !== 'partnership' || p.duration < 150)(this.processes[_i])) this.processes.splice(_i, 1) }
  }

  getProcesses(): DetenteProcess2[] { return this.processes }
}
