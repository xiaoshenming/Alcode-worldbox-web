// Diplomatic Ceasefire System (v3.175) - Temporary cessation of hostilities
// Civilizations negotiate ceasefires to pause conflicts and allow recovery

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

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
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Attempt to establish new ceasefires
    if (this.ceasefires.length < MAX_CEASEFIRES && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 3) {
        const fA = entities[Math.floor(Math.random() * entities.length)]
        const fB = entities[Math.floor(Math.random() * entities.length)]
        const med = entities[Math.floor(Math.random() * entities.length)]
        if (fA !== fB && fA !== med && fB !== med) {
          if (!this.ceasefires.some(c =>
            (c.factionA === fA && c.factionB === fB) ||
            (c.factionA === fB && c.factionB === fA)
          )) {
            const dur = 20 + Math.floor(Math.random() * 40)
            this.ceasefires.push({
              id: this.nextId++,
              factionA: fA, factionB: fB,
              duration: dur, remaining: dur,
              stability: 50 + Math.random() * 30,
              violations: 0,
              mediatorId: med, tick,
            })
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
        this.ceasefires.splice(i, 1)
      }
    }
  }

  getCeasefires(): readonly Ceasefire[] { return this.ceasefires }
}
