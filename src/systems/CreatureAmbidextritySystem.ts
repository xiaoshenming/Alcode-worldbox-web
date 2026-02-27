// Creature Ambidextrity System (v3.44) - Some creatures develop dual-hand proficiency
// Ambidextrous creatures gain combat and crafting bonuses

import { EntityManager } from '../ecs/Entity'

export type HandDominance = 'left' | 'right' | 'ambidextrous'

export interface AmbidextrityProfile {
  id: number
  entityId: number
  dominance: HandDominance
  leftSkill: number    // 0-100
  rightSkill: number   // 0-100
  trainingTicks: number
  combatBonus: number  // multiplier
  craftBonus: number   // multiplier
}

const CHECK_INTERVAL = 1000
const DEVELOP_CHANCE = 0.007
const TRAIN_RATE = 0.1
const MAX_PROFILES = 150
const AMBIDEXTROUS_THRESHOLD = 70

export class CreatureAmbidextritySystem {
  private profiles: AmbidextrityProfile[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Develop hand profiles for new creatures
    for (const eid of creatures) {
      if (this.profiles.length >= MAX_PROFILES) break
      if (this.profiles.some(p => p.entityId === eid)) continue
      if (Math.random() > DEVELOP_CHANCE) continue

      const leftSkill = 20 + Math.random() * 30
      const rightSkill = 20 + Math.random() * 30
      const dominance: HandDominance = leftSkill > rightSkill ? 'left' : 'right'

      this.profiles.push({
        id: this.nextId++,
        entityId: eid,
        dominance,
        leftSkill,
        rightSkill,
        trainingTicks: 0,
        combatBonus: 1.0,
        craftBonus: 1.0,
      })
    }

    // Train and update profiles
    for (const prof of this.profiles) {
      prof.trainingTicks += CHECK_INTERVAL

      // Gradually improve weaker hand
      if (prof.dominance === 'left') {
        prof.rightSkill = Math.min(100, prof.rightSkill + TRAIN_RATE)
      } else if (prof.dominance === 'right') {
        prof.leftSkill = Math.min(100, prof.leftSkill + TRAIN_RATE)
      }

      // Check for ambidextrous promotion
      if (prof.leftSkill >= AMBIDEXTROUS_THRESHOLD && prof.rightSkill >= AMBIDEXTROUS_THRESHOLD) {
        prof.dominance = 'ambidextrous'
        prof.combatBonus = 1.3
        prof.craftBonus = 1.2
      } else {
        const maxSkill = Math.max(prof.leftSkill, prof.rightSkill)
        prof.combatBonus = 1.0 + (maxSkill / 100) * 0.15
        prof.craftBonus = 1.0 + (maxSkill / 100) * 0.1
      }
    }

    // Remove profiles for dead creatures
    this.profiles = this.profiles.filter(p => em.hasComponent(p.entityId, 'creature'))
  }

  getProfiles(): AmbidextrityProfile[] {
    return this.profiles
  }

  getByEntity(entityId: number): AmbidextrityProfile | undefined {
    return this.profiles.find(p => p.entityId === entityId)
  }
}
