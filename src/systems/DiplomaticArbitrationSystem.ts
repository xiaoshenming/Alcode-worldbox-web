// Diplomatic Arbitration System (v3.215) - Third-party arbitration of disputes
// When nations cannot resolve their grievances alone, a neutral arbiter steps forward to weigh justice

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ArbitrationStatus = 'proposed' | 'active' | 'expired' | 'rejected'

export type DisputeType = 'territorial' | 'trade' | 'cultural' | 'military'

export interface ArbitrationPact {
  id: number; nationA: number; nationB: number
  status: ArbitrationStatus; strength: number
  arbiterNation: number
  disputeType: DisputeType
  fairnessScore: number
  bindingForce: number
  tick: number
}

const CHECK_INTERVAL = 3200
const FORM_CHANCE = 0.004
const MAX_PACTS = 28

const DISPUTE_TYPES: DisputeType[] = ['territorial', 'trade', 'cultural', 'military']

export class DiplomaticArbitrationSystem {
  private pacts: ArbitrationPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const nations = this.getNations(em)

    for (let i = 0; i < nations.length; i++) {
      for (let j = i + 1; j < nations.length; j++) {
        if (this.pacts.length >= MAX_PACTS) break
        if (Math.random() > FORM_CHANCE) continue

        const otherNations = nations.filter((_, idx) => idx !== i && idx !== j)
        const arbiterNation = otherNations.length > 0
          ? otherNations[Math.floor(Math.random() * otherNations.length)]
          : nations[i]

        const disputeType = DISPUTE_TYPES[Math.floor(Math.random() * DISPUTE_TYPES.length)]

        this.pacts.push({
          id: this.nextId++,
          nationA: nations[i],
          nationB: nations[j],
          status: 'proposed',
          strength: 20 + Math.random() * 60,
          arbiterNation,
          disputeType,
          fairnessScore: 30 + Math.random() * 70,
          bindingForce: 10 + Math.random() * 90,
          tick
        })
      }
    }

    for (const p of this.pacts) {
      if (p.status === 'proposed' && Math.random() < 0.3) p.status = 'active'
      if (p.status === 'active' && tick - p.tick > 30000) p.status = 'expired'
    }

    const cutoff = tick - 49000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].status === 'expired' && this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

  private getNations(em: EntityManager): number[] {
    const set = new Set<number>()
    for (const eid of em.getEntitiesWithComponents('creature')) set.add(eid % 6)
    return Array.from(set)
  }

  getPacts(): readonly ArbitrationPact[] { return this.pacts }
}
