// Creature Blacksmith System (v3.139) - Blacksmiths forge weapons and tools
// Skill and reputation grow with each item forged

import { EntityManager } from '../ecs/Entity'

export type BlacksmithSpecialty = 'weapons' | 'armor' | 'tools' | 'jewelry'

export interface BlacksmithData {
  entityId: number
  skill: number
  itemsForged: number
  specialty: BlacksmithSpecialty
  reputation: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 2800
const ASSIGN_CHANCE = 0.003
const MAX_BLACKSMITHS = 12

const SPECIALTIES: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
const SPECIALTY_SKILL_RATE: Record<BlacksmithSpecialty, number> = {
  weapons: 0.3, armor: 0.25, tools: 0.35, jewelry: 0.2,
}

export class CreatureBlacksmithSystem {
  private smiths: BlacksmithData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.smiths.length < MAX_BLACKSMITHS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const specialty = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)]
        this.smiths.push({
          entityId: eid,
          skill: 10 + Math.floor(Math.random() * 20),
          itemsForged: 0,
          specialty,
          reputation: 0,
          active: true,
          tick,
        })
      }
    }

    for (const s of this.smiths) {
      // Forge items periodically
      if (Math.random() < 0.02) {
        s.itemsForged++
        s.skill = Math.min(100, s.skill + SPECIALTY_SKILL_RATE[s.specialty])
        s.reputation = Math.min(100, s.reputation + 0.15)
      }
      // Masterwork bonus at high skill
      if (s.skill > 80 && Math.random() < 0.005) {
        s.reputation = Math.min(100, s.reputation + 2)
      }
      // Occasional setback
      if (Math.random() < 0.002) {
        s.reputation = Math.max(0, s.reputation - 1)
      }
    }

    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.smiths.length - 1; i >= 0; i--) {
      if (!alive.has(this.smiths[i].entityId)) this.smiths.splice(i, 1)
    }
  }

  getSmiths(): readonly BlacksmithData[] { return this.smiths }
}
