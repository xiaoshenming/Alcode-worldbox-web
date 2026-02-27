// Diplomatic Arbitrement System (v3.463) - Arbitrement diplomacy
// Binding decisions by neutral parties to resolve territorial and resource disputes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ArbitrementPhase = 'filing' | 'hearing' | 'deliberation' | 'ruling'

export interface ArbitrementCase {
  id: number
  civIdA: number
  civIdB: number
  phase: ArbitrementPhase
  caseStrength: number
  neutrality: number
  bindingForce: number
  compliance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2590
const FILE_CHANCE = 0.0019
const MAX_CASES = 15

export class DiplomaticArbitrementSystem {
  private cases: ArbitrementCase[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cases.length < MAX_CASES && Math.random() < FILE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      if (a === b) return

      this.cases.push({
        id: this.nextId++,
        civIdA: a,
        civIdB: b,
        phase: 'filing',
        caseStrength: 10 + Math.random() * 35,
        neutrality: 30 + Math.random() * 40,
        bindingForce: 20 + Math.random() * 30,
        compliance: 0,
        duration: 0,
        tick,
      })
    }

    for (const c of this.cases) {
      c.duration++
      c.caseStrength = Math.min(100, c.caseStrength + 0.02)
      if (c.phase === 'filing' && c.duration > 20) c.phase = 'hearing'
      if (c.phase === 'hearing' && c.duration > 50) c.phase = 'deliberation'
      if (c.phase === 'deliberation' && c.duration > 70) {
        c.phase = 'ruling'
        c.compliance = c.bindingForce * 0.8
      }
    }

    for (let _i = this.cases.length - 1; _i >= 0; _i--) { if (!((c) => c.phase !== 'ruling' || c.duration < 100)(this.cases[_i])) this.cases.splice(_i, 1) }
  }

  getCases(): ArbitrementCase[] { return this.cases }
}
