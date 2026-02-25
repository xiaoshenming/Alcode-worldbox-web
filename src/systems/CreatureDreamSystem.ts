// Creature Dream System (v2.51) - Creatures dream during sleep
// Dreams influence mood, creativity, and can trigger premonitions
// Nightmare frequency increases during war or famine

import { EntityManager, EntityId } from '../ecs/Entity'

export type DreamType = 'peaceful' | 'nightmare' | 'prophetic' | 'nostalgic' | 'adventure' | 'creative'

export interface CreatureDream {
  entityId: EntityId
  type: DreamType
  intensity: number     // 0-100
  startedAt: number
  moodEffect: number    // -20 to +20
}

const CHECK_INTERVAL = 800
const DREAM_INTERVAL = 500
const MAX_DREAMS = 80
const DREAM_CHANCE = 0.05

const DREAM_TYPES: DreamType[] = ['peaceful', 'nightmare', 'prophetic', 'nostalgic', 'adventure', 'creative']

const DREAM_MOOD: Record<DreamType, [number, number]> = {
  peaceful: [5, 15],
  nightmare: [-20, -5],
  prophetic: [0, 10],
  nostalgic: [-5, 10],
  adventure: [5, 20],
  creative: [8, 18],
}

export class CreatureDreamSystem {
  private dreams: CreatureDream[] = []
  private lastCheck = 0
  private lastDream = 0
  private totalDreams = 0
  private nightmareCount = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.generateDreams(em, tick)
    }
    if (tick - this.lastDream >= DREAM_INTERVAL) {
      this.lastDream = tick
      this.processDreams(em, tick)
    }
  }

  private generateDreams(em: EntityManager, tick: number): void {
    if (this.dreams.length >= MAX_DREAMS) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      if (Math.random() > DREAM_CHANCE) continue
      if (this.dreams.some(d => d.entityId === id)) continue
      const creature = em.getComponent<any>(id, 'creature')
      if (!creature) continue

      const isStressed = (creature.hunger != null && creature.hunger > 70) || (creature.mood != null && creature.mood < 30)
      let type: DreamType
      if (isStressed && Math.random() < 0.4) {
        type = 'nightmare'
      } else {
        type = DREAM_TYPES[Math.floor(Math.random() * DREAM_TYPES.length)]
      }

      const [minMood, maxMood] = DREAM_MOOD[type]
      const moodEffect = minMood + Math.floor(Math.random() * (maxMood - minMood + 1))

      this.dreams.push({
        entityId: id,
        type,
        intensity: 30 + Math.floor(Math.random() * 70),
        startedAt: tick,
        moodEffect,
      })
      this.totalDreams++
      if (type === 'nightmare') this.nightmareCount++
      if (this.dreams.length >= MAX_DREAMS) break
    }
  }

  private processDreams(em: EntityManager, tick: number): void {
    const expired: number[] = []
    for (let i = 0; i < this.dreams.length; i++) {
      const dream = this.dreams[i]
      if (tick - dream.startedAt > 1500) {
        expired.push(i)
        continue
      }
      const creature = em.getComponent<any>(dream.entityId, 'creature')
      if (!creature) { expired.push(i); continue }
      if (creature.mood != null) {
        creature.mood = Math.max(0, Math.min(100, creature.mood + dream.moodEffect * 0.05))
      }
    }
    for (let i = expired.length - 1; i >= 0; i--) {
      this.dreams.splice(expired[i], 1)
    }
  }

  getDreams(): CreatureDream[] { return this.dreams }
  getActiveDreams(): CreatureDream[] { return this.dreams }
  getTotalDreams(): number { return this.totalDreams }
  getNightmareCount(): number { return this.nightmareCount }
}
