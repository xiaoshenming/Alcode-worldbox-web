// Diplomatic Ceasefire System (v3.175) - Temporary cessation of hostilities
// Civilizations negotiate ceasefires to pause conflicts and allow recovery

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { pickRandom } from '../utils/RandomUtils'

export interface Ceasefire {
  id: number
  factionA: number
  factionB: number
  duration: number
  remaining: number
  stability: number
  violations: number
  mediatorId: number
  tick: number
}

const CHECK_INTERVAL = 5000
const SPAWN_CHANCE = 0.002
const MAX_CEASEFIRES = 8

export class DiplomaticCeasefireSystem {
  private ceasefires: Ceasefire[] = []
  private _ceasefireKeySet = new Set<string>()   // key: `${min}_${max}` for faction pair
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Attempt to establish new ceasefires
    if (this.ceasefires.length < MAX_CEASEFIRES && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 3) {
        const fA = pickRandom(entities)
        const fB = pickRandom(entities)
        const med = pickRandom(entities)
        if (fA !== fB && fA !== med && fB !== med) {
          const cfKey = `${Math.min(fA, fB)}_${Math.max(fA, fB)}`
          if (!this._ceasefireKeySet.has(cfKey)) {
            const dur = 20 + Math.floor(Math.random() * 40)
            this.ceasefires.push({
              id: this.nextId++,
              factionA: fA, factionB: fB,
              duration: dur, remaining: dur,
              stability: 50 + Math.random() * 30,
              violations: 0,
              mediatorId: med, tick,
            })
            this._ceasefireKeySet.add(cfKey)
          }
        }
      }
    }

    for (const cf of this.ceasefires) {
      cf.remaining--

      // Stability fluctuation
      cf.stability = Math.max(0, Math.min(100, cf.stability + (Math.random() - 0.45) * 3))

      // Random violations
      if (Math.random() < (1 - cf.stability / 100) * 0.03) {
        cf.violations++
        cf.stability = Math.max(0, cf.stability - 10)
      }

      // Mediator improves stability
      if (em.hasComponent(cf.mediatorId, 'creature') && Math.random() < 0.02) {
        cf.stability = Math.min(100, cf.stability + 3)
      }
    }

    // Remove expired or collapsed ceasefires
    for (let i = this.ceasefires.length - 1; i >= 0; i--) {
      const cf = this.ceasefires[i]
      if (cf.remaining <= 0 || cf.stability <= 5) {
        this._ceasefireKeySet.delete(`${Math.min(cf.factionA, cf.factionB)}_${Math.max(cf.factionA, cf.factionB)}`)
        this.ceasefires.splice(i, 1)
      }
    }
  }

}
