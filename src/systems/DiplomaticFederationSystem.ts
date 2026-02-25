// Diplomatic Federation System (v3.300) - Federal union agreements
// Treaties forming federal unions where civilizations share governance

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type FederationType = 'political' | 'economic' | 'military' | 'cultural'

export interface FederationTreaty {
  id: number
  memberCivIds: number[]
  federationType: FederationType
  centralAuthority: number
  memberAutonomy: number
  cohesion: number
  prosperity: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2600
const TREATY_CHANCE = 0.002
const MAX_FEDERATIONS = 12

const TYPES: FederationType[] = ['political', 'economic', 'military', 'cultural']

export class DiplomaticFederationSystem {
  private federations: FederationTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.federations.length < MAX_FEDERATIONS && Math.random() < TREATY_CHANCE) {
      const numMembers = 2 + Math.floor(Math.random() * 3)
      const members: number[] = []
      for (let m = 0; m < numMembers; m++) {
        const cId = 1 + Math.floor(Math.random() * 8)
        if (!members.includes(cId)) members.push(cId)
      }
      if (members.length < 2) return

      const fType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.federations.push({
        id: this.nextId++,
        memberCivIds: members,
        federationType: fType,
        centralAuthority: 20 + Math.random() * 40,
        memberAutonomy: 30 + Math.random() * 40,
        cohesion: 40 + Math.random() * 30,
        prosperity: 20 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const fed of this.federations) {
      fed.duration += 1
      fed.cohesion = Math.max(10, Math.min(100, fed.cohesion + (Math.random() - 0.5) * 0.15))
      fed.prosperity = Math.max(5, Math.min(80, fed.prosperity + (Math.random() - 0.45) * 0.12))
      fed.centralAuthority = Math.max(10, Math.min(80, fed.centralAuthority + (Math.random() - 0.5) * 0.1))
      fed.memberAutonomy = Math.max(10, Math.min(80, fed.memberAutonomy + (Math.random() - 0.5) * 0.1))
    }

    const cutoff = tick - 90000
    for (let i = this.federations.length - 1; i >= 0; i--) {
      if (this.federations[i].tick < cutoff) this.federations.splice(i, 1)
    }
  }

  getFederations(): FederationTreaty[] { return this.federations }
}
