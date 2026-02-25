// Diplomatic Entente System (v3.349) - Entente agreements
// Informal alliances based on mutual understanding without formal treaties

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type EntenteLevel = 'cordial' | 'cooperative' | 'strategic' | 'comprehensive'

export interface EntenteAgreement {
  id: number
  civIdA: number
  civIdB: number
  level: EntenteLevel
  mutualTrust: number
  cooperationDepth: number
  sharedInterests: number
  informalBonds: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2350
const TREATY_CHANCE = 0.0027
const MAX_TREATIES = 20

const LEVELS: EntenteLevel[] = ['cordial', 'cooperative', 'strategic', 'comprehensive']

export class DiplomaticEntenteSystem {
  private treaties: EntenteAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const level = LEVELS[Math.floor(Math.random() * LEVELS.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        level,
        mutualTrust: 15 + Math.random() * 35,
        cooperationDepth: 10 + Math.random() * 25,
        sharedInterests: 20 + Math.random() * 30,
        informalBonds: 8 + Math.random() * 22,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.mutualTrust = Math.max(5, Math.min(85, treaty.mutualTrust + (Math.random() - 0.45) * 0.13))
      treaty.cooperationDepth = Math.max(5, Math.min(75, treaty.cooperationDepth + (Math.random() - 0.46) * 0.11))
      treaty.sharedInterests = Math.max(10, Math.min(80, treaty.sharedInterests + (Math.random() - 0.47) * 0.1))
      treaty.informalBonds = Math.max(3, Math.min(65, treaty.informalBonds + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 84000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): EntenteAgreement[] { return this.treaties }
}
