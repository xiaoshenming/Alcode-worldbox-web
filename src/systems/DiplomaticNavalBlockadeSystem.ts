// Diplomatic Naval Blockade System (v3.78) - Civilizations blockade enemy ports
// Blockades restrict trade, starve resources, and can escalate conflicts

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type BlockadeStrength = 'light' | 'moderate' | 'heavy' | 'total'

export interface NavalBlockade {
  id: number
  blockaderCivId: number
  targetCivId: number
  strength: BlockadeStrength
  effectiveness: number
  tradeReduction: number
  moraleDamage: number
  tick: number
}

const CHECK_INTERVAL = 1800
const BLOCKADE_CHANCE = 0.003
const MAX_BLOCKADES = 30

const STRENGTHS: BlockadeStrength[] = ['light', 'moderate', 'heavy', 'total']

export class DiplomaticNavalBlockadeSystem {
  private _civsBuf: Civilization[] = []
  private blockades: NavalBlockade[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    if (this.blockades.length < MAX_BLOCKADES && Math.random() < BLOCKADE_CHANCE) {
      const i = Math.floor(Math.random() * civs.length)
      let j = Math.floor(Math.random() * (civs.length - 1))
      if (j >= i) j++
      const blockader = civs[i]
      const target = civs[j]

      const strengthIdx = Math.floor(Math.random() * STRENGTHS.length)
      const strength = STRENGTHS[strengthIdx]
      const effectiveness = 25 * (strengthIdx + 1) * (0.6 + Math.random() * 0.4)

      this.blockades.push({
        id: this.nextId++,
        blockaderCivId: blockader.id,
        targetCivId: target.id,
        strength,
        effectiveness,
        tradeReduction: effectiveness * 0.8,
        moraleDamage: effectiveness * 0.3,
        tick,
      })
    }

    // Blockades weaken over time
    for (const b of this.blockades) {
      b.effectiveness = Math.max(0, b.effectiveness - 0.05)
      b.tradeReduction = b.effectiveness * 0.8
    }

    const cutoff = tick - 40000
    for (let i = this.blockades.length - 1; i >= 0; i--) {
      if (this.blockades[i].tick < cutoff || this.blockades[i].effectiveness <= 0) {
        this.blockades.splice(i, 1)
      }
    }
  }

  getBlockades(): readonly NavalBlockade[] { return this.blockades }
}
