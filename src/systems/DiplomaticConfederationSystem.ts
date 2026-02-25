// Diplomatic Confederation System (v3.305) - Loose alliance confederations
// Loose associations of sovereign civilizations cooperating on shared interests

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConfederationPurpose = 'defense' | 'trade' | 'cultural' | 'territorial'

export interface Confederation {
  id: number
  memberCivIds: number[]
  purpose: ConfederationPurpose
  sovereignty: number
  cooperation: number
  sharedResources: number
  stability: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const FORM_CHANCE = 0.002
const MAX_CONFEDERATIONS = 14

const PURPOSES: ConfederationPurpose[] = ['defense', 'trade', 'cultural', 'territorial']

export class DiplomaticConfederationSystem {
  private confederations: Confederation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.confederations.length < MAX_CONFEDERATIONS && Math.random() < FORM_CHANCE) {
      const numMembers = 2 + Math.floor(Math.random() * 4)
      const members: number[] = []
      for (let m = 0; m < numMembers; m++) {
        const cId = 1 + Math.floor(Math.random() * 8)
        if (!members.includes(cId)) members.push(cId)
      }
      if (members.length < 2) return

      const purpose = PURPOSES[Math.floor(Math.random() * PURPOSES.length)]

      this.confederations.push({
        id: this.nextId++,
        memberCivIds: members,
        purpose,
        sovereignty: 60 + Math.random() * 30,
        cooperation: 30 + Math.random() * 35,
        sharedResources: 10 + Math.random() * 25,
        stability: 35 + Math.random() * 35,
        duration: 0,
        tick,
      })
    }

    for (const conf of this.confederations) {
      conf.duration += 1
      conf.cooperation = Math.max(10, Math.min(90, conf.cooperation + (Math.random() - 0.5) * 0.15))
      conf.stability = Math.max(10, Math.min(90, conf.stability + (Math.random() - 0.5) * 0.12))
      conf.sharedResources = Math.max(5, Math.min(50, conf.sharedResources + (Math.random() - 0.45) * 0.1))
      conf.sovereignty = Math.max(40, Math.min(95, conf.sovereignty + (Math.random() - 0.5) * 0.08))
    }

    const cutoff = tick - 88000
    for (let i = this.confederations.length - 1; i >= 0; i--) {
      if (this.confederations[i].tick < cutoff) this.confederations.splice(i, 1)
    }
  }

  getConfederations(): Confederation[] { return this.confederations }
}
