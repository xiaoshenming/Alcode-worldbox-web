// Diplomatic Neutralization System (v3.295) - Neutrality agreements
// Treaties establishing permanent neutrality for territories or civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type NeutralityType = 'permanent' | 'armed' | 'guaranteed' | 'conditional'

export interface NeutralityTreaty {
  id: number
  neutralCivId: number
  guarantorCivIds: number[]
  neutralityType: NeutralityType
  compliance: number
  internationalRespect: number
  economicBenefit: number
  militaryRestriction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.0025
const MAX_TREATIES = 18

const TYPES: NeutralityType[] = ['permanent', 'armed', 'guaranteed', 'conditional']

export class DiplomaticNeutralizationSystem {
  private treaties: NeutralityTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const neutral = 1 + Math.floor(Math.random() * 8)
      const numGuarantors = 1 + Math.floor(Math.random() * 3)
      const guarantors: number[] = []
      for (let g = 0; g < numGuarantors; g++) {
        const gId = 1 + Math.floor(Math.random() * 8)
        if (gId !== neutral && !guarantors.includes(gId)) guarantors.push(gId)
      }
      if (guarantors.length === 0) return

      const nType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.treaties.push({
        id: this.nextId++,
        neutralCivId: neutral,
        guarantorCivIds: guarantors,
        neutralityType: nType,
        compliance: 50 + Math.random() * 30,
        internationalRespect: 30 + Math.random() * 40,
        economicBenefit: 10 + Math.random() * 30,
        militaryRestriction: nType === 'armed' ? 20 + Math.random() * 20 : 50 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.compliance = Math.max(10, Math.min(100, treaty.compliance + (Math.random() - 0.48) * 0.15))
      treaty.internationalRespect = Math.max(10, Math.min(100, treaty.internationalRespect + (Math.random() - 0.47) * 0.12))
      treaty.economicBenefit = Math.max(5, Math.min(60, treaty.economicBenefit + (Math.random() - 0.45) * 0.1))
      treaty.militaryRestriction = Math.max(10, Math.min(90, treaty.militaryRestriction + (Math.random() - 0.5) * 0.08))
    }

    const cutoff = tick - 85000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

}
