// Diplomatic Armistice System (v3.160) - Temporary ceasefire agreements
// Warring civilizations negotiate armistices that may hold or collapse

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ArmisticeStatus = 'proposed' | 'active' | 'expired' | 'violated'

export interface Armistice {
  id: number
  civIdA: number
  civIdB: number
  duration: number
  remaining: number
  violations: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.003
const MAX_ARMISTICES = 10

export class DiplomaticArmisticSystem {
  private armistices: Armistice[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = Array.from(civManager.civilizations.values())
    if (civs.length < 2) return

    // Propose new armistices between warring factions
    if (this.armistices.length < MAX_ARMISTICES && Math.random() < SPAWN_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      const cidA = civs[iA].id
      const cidB = civs[iB].id

      // Avoid duplicate armistices between same pair
      const exists = this.armistices.some(
        a => (a.civIdA === cidA && a.civIdB === cidB) ||
             (a.civIdA === cidB && a.civIdB === cidA)
      )
      if (!exists) {
        const dur = 3000 + Math.floor(Math.random() * 7000)
        this.armistices.push({
          id: this.nextId++,
          civIdA: cidA,
          civIdB: cidB,
          duration: dur,
          remaining: dur,
          violations: 0,
          stability: 50 + Math.random() * 40,
          tick,
        })
      }
    }

    // Update active armistices
    for (const a of this.armistices) {
      a.remaining -= CHECK_INTERVAL

      // Random violation events erode stability
      if (Math.random() < 0.04) {
        a.violations++
        a.stability = Math.max(0, a.stability - 5 - Math.random() * 10)
      }

      // Stability can slowly recover if no violations
      if (a.violations === 0 && Math.random() < 0.1) {
        a.stability = Math.min(100, a.stability + 1)
      }
    }

    // Remove expired or collapsed armistices
    for (let i = this.armistices.length - 1; i >= 0; i--) {
      const a = this.armistices[i]
      if (a.remaining <= 0 || a.stability <= 0) {
        this.armistices.splice(i, 1)
      }
    }
  }

  getArmistices(): readonly Armistice[] { return this.armistices }
}
