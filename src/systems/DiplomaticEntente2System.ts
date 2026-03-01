// Diplomatic Entente 2 System (v3.475) - Advanced entente diplomacy
// Informal agreements of mutual understanding and cooperation between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type EntenteLevel2 = 'informal' | 'cordial' | 'strategic' | 'allied'

export interface EntenteAgreement2 {
  id: number
  civIdA: number
  civIdB: number
  level: EntenteLevel2
  mutualTrust: number
  sharedInterests: number
  cooperationDepth: number
  publicEndorsement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2620
const INITIATE_CHANCE = 0.0018
const MAX_ENTENTES = 15

export class DiplomaticEntente2System {
  private ententes: EntenteAgreement2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.ententes.length < MAX_ENTENTES && Math.random() < INITIATE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      if (a === b) return

      this.ententes.push({
        id: this.nextId++,
        civIdA: a,
        civIdB: b,
        level: 'informal',
        mutualTrust: 10 + Math.random() * 20,
        sharedInterests: 15 + Math.random() * 25,
        cooperationDepth: 5 + Math.random() * 15,
        publicEndorsement: 10 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const e of this.ententes) {
      e.duration++
      e.mutualTrust = Math.min(100, e.mutualTrust + 0.025)
      e.cooperationDepth = Math.min(100, e.cooperationDepth + 0.02)
      if (e.level === 'informal' && e.mutualTrust > 30) e.level = 'cordial'
      if (e.level === 'cordial' && e.mutualTrust > 55) e.level = 'strategic'
      if (e.level === 'strategic' && e.mutualTrust > 80) e.level = 'allied'
    }

    for (let _i = this.ententes.length - 1; _i >= 0; _i--) { if (!((e) => e.level !== 'allied' || e.duration < 200)(this.ententes[_i])) this.ententes.splice(_i, 1) }
  }

}
