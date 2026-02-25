// Diplomatic Concord System (v3.355) - Concord treaties
// Harmonious agreements establishing lasting peace and cooperation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConcordPillar = 'peace' | 'prosperity' | 'justice' | 'unity'

export interface ConcordTreaty {
  id: number
  civIdA: number
  civIdB: number
  pillar: ConcordPillar
  harmonyLevel: number
  cooperationIndex: number
  peaceStability: number
  culturalUnity: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2340
const TREATY_CHANCE = 0.0027
const MAX_TREATIES = 20

const PILLARS: ConcordPillar[] = ['peace', 'prosperity', 'justice', 'unity']

export class DiplomaticConcordSystem {
  private treaties: ConcordTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const pillar = PILLARS[Math.floor(Math.random() * PILLARS.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        pillar,
        harmonyLevel: 20 + Math.random() * 35,
        cooperationIndex: 15 + Math.random() * 30,
        peaceStability: 25 + Math.random() * 35,
        culturalUnity: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.harmonyLevel = Math.max(10, Math.min(90, treaty.harmonyLevel + (Math.random() - 0.44) * 0.13))
      treaty.cooperationIndex = Math.max(5, Math.min(80, treaty.cooperationIndex + (Math.random() - 0.45) * 0.11))
      treaty.peaceStability = Math.max(10, Math.min(90, treaty.peaceStability + (Math.random() - 0.46) * 0.12))
      treaty.culturalUnity = Math.max(5, Math.min(70, treaty.culturalUnity + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 85000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): ConcordTreaty[] { return this.treaties }
}
