// Diplomatic Annexation System (v3.280) - Territorial annexation treaties
// Formal agreements for one civilization to absorb territory from another

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AnnexationType = 'peaceful' | 'coerced' | 'negotiated' | 'referendum'

export interface AnnexationTreaty {
  id: number
  annexerCivId: number
  targetCivId: number
  annexationType: AnnexationType
  territorySize: number
  territoryTransferred: number
  legitimacy: number
  resistance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2600
const TREATY_CHANCE = 0.0025
const MAX_TREATIES = 20

const TYPES: AnnexationType[] = ['peaceful', 'coerced', 'negotiated', 'referendum']

export class DiplomaticAnnexationSystem {
  private treaties: AnnexationTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const annexer = 1 + Math.floor(Math.random() * 8)
      const target = 1 + Math.floor(Math.random() * 8)
      if (annexer === target) return

      const aType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.treaties.push({
        id: this.nextId++,
        annexerCivId: annexer,
        targetCivId: target,
        annexationType: aType,
        territorySize: 10 + Math.floor(Math.random() * 40),
        territoryTransferred: 0,
        legitimacy: aType === 'peaceful' ? 60 + Math.random() * 30 : 15 + Math.random() * 40,
        resistance: aType === 'coerced' ? 50 + Math.random() * 40 : 10 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      if (Math.random() < (treaty.legitimacy * 0.003)) {
        treaty.territoryTransferred = Math.min(treaty.territorySize, treaty.territoryTransferred + 1)
      }
      treaty.legitimacy = Math.max(5, Math.min(100, treaty.legitimacy + (Math.random() - 0.48) * 0.15))
      treaty.resistance = Math.max(0, Math.min(100, treaty.resistance + (Math.random() - 0.52) * 0.2))
    }

    const cutoff = tick - 85000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

}
