// Diplomatic Solidarity System (v3.361) - Solidarity pacts
// Mutual support agreements where civilizations pledge to stand together

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SolidarityBasis = 'cultural' | 'ideological' | 'economic' | 'defensive'

export interface SolidarityPact {
  id: number
  civIdA: number
  civIdB: number
  basis: SolidarityBasis
  commitment: number
  mutualAid: number
  publicSupport: number
  cohesion: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2370
const TREATY_CHANCE = 0.0026
const MAX_PACTS = 20

const BASES: SolidarityBasis[] = ['cultural', 'ideological', 'economic', 'defensive']

export class DiplomaticSolidaritySystem {
  private pacts: SolidarityPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const basis = BASES[Math.floor(Math.random() * BASES.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        basis,
        commitment: 20 + Math.random() * 35,
        mutualAid: 15 + Math.random() * 30,
        publicSupport: 25 + Math.random() * 35,
        cohesion: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.pacts) {
      p.duration += 1
      p.commitment = Math.max(10, Math.min(85, p.commitment + (Math.random() - 0.46) * 0.12))
      p.mutualAid = Math.max(5, Math.min(75, p.mutualAid + (Math.random() - 0.45) * 0.11))
      p.publicSupport = Math.max(10, Math.min(85, p.publicSupport + (Math.random() - 0.47) * 0.13))
      p.cohesion = Math.max(5, Math.min(70, p.cohesion + (Math.random() - 0.44) * 0.1))
    }

    const cutoff = tick - 82000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

}
