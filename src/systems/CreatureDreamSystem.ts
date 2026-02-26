// Creature Dream System (v2.86) - Creatures dream during rest, affecting mood and behavior
// Dreams can be prophetic, nightmarish, or nostalgic, influencing next-day actions

import { EntityManager } from '../ecs/Entity'

export type DreamType = 'prophetic' | 'nightmare' | 'nostalgic' | 'peaceful' | 'adventure' | 'warning'

export interface Dream {
  id: number
  creatureId: number
  type: DreamType
  intensity: number    // 0-100
  moodEffect: number   // -20 to +20
  tick: number
}

const CHECK_INTERVAL = 1200
const DREAM_CHANCE = 0.03
const MAX_DREAM_LOG = 60

const DREAM_WEIGHTS: Record<DreamType, { weight: number; moodMin: number; moodMax: number }> = {
  prophetic: { weight: 0.1, moodMin: 5, moodMax: 15 },
  nightmare: { weight: 0.2, moodMin: -20, moodMax: -5 },
  nostalgic: { weight: 0.2, moodMin: -5, moodMax: 10 },
  peaceful: { weight: 0.25, moodMin: 5, moodMax: 20 },
  adventure: { weight: 0.15, moodMin: 0, moodMax: 10 },
  warning: { weight: 0.1, moodMin: -10, moodMax: 0 },
}

const DREAM_TYPES = Object.keys(DREAM_WEIGHTS) as DreamType[]

export class CreatureDreamSystem {
  private dreamLog: Dream[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateDreams(em, tick)
    this.pruneLog()
  }

  private generateDreams(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      if (Math.random() > DREAM_CHANCE) continue

      const type = this.pickDreamType()
      const config = DREAM_WEIGHTS[type]
      const moodEffect = config.moodMin + Math.random() * (config.moodMax - config.moodMin)

      this.dreamLog.push({
        id: this.nextId++,
        creatureId: eid,
        type,
        intensity: 20 + Math.random() * 80,
        moodEffect: Math.round(moodEffect),
        tick,
      })
    }
  }

  private pickDreamType(): DreamType {
    const r = Math.random()
    let cumulative = 0
    for (const type of DREAM_TYPES) {
      cumulative += DREAM_WEIGHTS[type].weight
      if (r <= cumulative) return type
    }
    return 'peaceful'
  }

  private pruneLog(): void {
    if (this.dreamLog.length > MAX_DREAM_LOG) {
      this.dreamLog.splice(0, this.dreamLog.length - MAX_DREAM_LOG)
    }
  }

  getDreamLog(): Dream[] { return this.dreamLog }
  getRecentDreams(count: number): Dream[] { return this.dreamLog.slice(-count) }
  getNightmareCount(): number { return this.dreamLog.filter(d => d.type === 'nightmare').length }
}
