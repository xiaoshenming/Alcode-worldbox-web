// Diplomatic Plebiscite System (v3.220) - Popular votes on territorial and political questions
// Citizens cast ballots to decide the fate of disputed lands and contested policies

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PlebisciteStatus = 'proposed' | 'active' | 'expired' | 'rejected'

export interface PlebiscitePact {
  id: number
  nationA: number
  nationB: number
  status: PlebisciteStatus
  strength: number
  voterTurnout: number
  approvalRate: number
  legitimacy: number
  contestedBy: number
  tick: number
}

const CHECK_INTERVAL = 3400
const FORM_CHANCE = 0.004
const MAX_PACTS = 25

export class DiplomaticPlebisciteSystem {
  private pacts: PlebiscitePact[] = []
  private nextId = 1
  private lastCheck = 0
  private _nationsSet = new Set<number>()
  private _nationsBuf: number[] = []

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const nations = this.getNations(em)

    for (let i = 0; i < nations.length; i++) {
      for (let j = i + 1; j < nations.length; j++) {
        if (this.pacts.length >= MAX_PACTS) break
        if (Math.random() > FORM_CHANCE) continue

        if (!this.pacts.some(p =>
          (p.nationA === nations[i] && p.nationB === nations[j]) ||
          (p.nationA === nations[j] && p.nationB === nations[i])
        )) {
          this.pacts.push({
            id: this.nextId++,
            nationA: nations[i],
            nationB: nations[j],
            status: 'proposed',
            strength: 20 + Math.random() * 40,
            voterTurnout: 30 + Math.random() * 50,
            approvalRate: 25 + Math.random() * 50,
            legitimacy: 20 + Math.random() * 40,
            contestedBy: Math.random() < 0.3 ? nations[Math.floor(Math.random() * nations.length)] : 0,
            tick,
          })
        }
      }
    }

    for (const p of this.pacts) {
      if (p.status === 'proposed' && Math.random() < 0.15) {
        p.status = p.approvalRate > 40 ? 'active' : 'rejected'
      }
      if (p.status === 'active') {
        p.voterTurnout = Math.max(0, Math.min(100, p.voterTurnout + (Math.random() - 0.4) * 3))
        p.approvalRate = Math.max(0, Math.min(100, p.approvalRate + (Math.random() - 0.45) * 4))
        p.legitimacy = Math.max(0, Math.min(100, p.legitimacy + (Math.random() - 0.4) * 2))
        p.strength = Math.max(0, Math.min(100, p.strength + (Math.random() - 0.5) * 3))
        if (tick - p.tick > 30000) p.status = 'expired'
      }
    }

    const cutoff = tick - 51000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].status === 'expired' && this.pacts[i].tick < cutoff) {
        this.pacts.splice(i, 1)
      }
    }
  }

  private getNations(em: EntityManager): number[] {
    this._nationsSet.clear()
    for (const eid of em.getEntitiesWithComponents('creature')) this._nationsSet.add(eid % 6)
    this._nationsBuf.length = 0
    for (const n of this._nationsSet) this._nationsBuf.push(n)
    return this._nationsBuf
  }

  getPacts(): readonly PlebiscitePact[] { return this.pacts }
}
