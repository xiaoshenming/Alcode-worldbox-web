// Diplomatic Secession System (v3.285) - Territorial secession movements
// Regions seeking independence from parent civilizations through diplomatic means

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SecessionMethod = 'referendum' | 'declaration' | 'negotiated' | 'revolt'

export interface SecessionMovement {
  id: number
  parentCivId: number
  regionId: number
  method: SecessionMethod
  support: number
  opposition: number
  legitimacy: number
  internationalRecognition: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const MOVEMENT_CHANCE = 0.0025
const MAX_MOVEMENTS = 20

const METHODS: SecessionMethod[] = ['referendum', 'declaration', 'negotiated', 'revolt']

export class DiplomaticSecessionSystem {
  private movements: SecessionMovement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.movements.length < MAX_MOVEMENTS && Math.random() < MOVEMENT_CHANCE) {
      const parent = 1 + Math.floor(Math.random() * 8)
      const region = 1 + Math.floor(Math.random() * 12)
      const method = METHODS[Math.floor(Math.random() * METHODS.length)]

      this.movements.push({
        id: this.nextId++,
        parentCivId: parent,
        regionId: region,
        method,
        support: 20 + Math.random() * 40,
        opposition: 20 + Math.random() * 40,
        legitimacy: method === 'referendum' ? 50 + Math.random() * 30 : 15 + Math.random() * 35,
        internationalRecognition: 10 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const movement of this.movements) {
      movement.duration += 1
      movement.support = Math.max(5, Math.min(95, movement.support + (Math.random() - 0.48) * 0.2))
      movement.opposition = Math.max(5, Math.min(95, movement.opposition + (Math.random() - 0.52) * 0.18))
      movement.legitimacy = Math.max(5, Math.min(100, movement.legitimacy + (Math.random() - 0.5) * 0.12))
      movement.internationalRecognition = Math.max(0, Math.min(100, movement.internationalRecognition + (Math.random() - 0.45) * 0.15))
    }

    const cutoff = tick - 80000
    for (let i = this.movements.length - 1; i >= 0; i--) {
      if (this.movements[i].tick < cutoff) this.movements.splice(i, 1)
    }
  }

  getMovements(): SecessionMovement[] { return this.movements }
}
