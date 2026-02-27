// Creature Hobby System (v2.26) - Creatures develop hobbies that affect mood and social bonds
// Hobbies: fishing, painting, stargazing, gardening, storytelling, crafting
// Creatures with shared hobbies form stronger social bonds

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export type HobbyType = 'fishing' | 'painting' | 'stargazing' | 'gardening' | 'storytelling' | 'crafting'

export interface CreatureHobby {
  entityId: EntityId
  hobby: HobbyType
  skill: number        // 0-100
  enjoyment: number    // mood bonus
  lastPracticed: number
  socialPartner: EntityId | null
}

const CHECK_INTERVAL = 600
const PRACTICE_INTERVAL = 400
const SKILL_GAIN = 2
const MAX_SKILL = 100
const HOBBY_RANGE = 10
const MAX_HOBBIES = 200

const HOBBY_WEIGHTS: Record<HobbyType, number> = {
  fishing: 20,
  painting: 15,
  stargazing: 15,
  gardening: 20,
  storytelling: 15,
  crafting: 15,
}

const HOBBY_LIST: HobbyType[] = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
const HOBBY_TOTAL = Object.values(HOBBY_WEIGHTS).reduce((s, w) => s + w, 0)

export class CreatureHobbySystem {
  private hobbies: Map<EntityId, CreatureHobby> = new Map()
  private lastCheck = 0
  private lastPractice = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.assignHobbies(em, tick)
    }
    if (tick - this.lastPractice >= PRACTICE_INTERVAL) {
      this.lastPractice = tick
      this.practiceHobbies(em, tick)
    }
  }

  private assignHobbies(em: EntityManager, tick: number): void {
    if (this.hobbies.size >= MAX_HOBBIES) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      if (this.hobbies.has(id)) continue
      if (this.hobbies.size >= MAX_HOBBIES) break
      if (Math.random() > 0.08) continue
      const hobby = this.pickHobby()
      this.hobbies.set(id, {
        entityId: id,
        hobby,
        skill: 0,
        enjoyment: 5 + Math.floor(Math.random() * 10),
        lastPracticed: tick,
        socialPartner: null,
      })
    }
  }

  private practiceHobbies(em: EntityManager, tick: number): void {
    for (const [id, hobby] of this.hobbies) {
      if (!em.getComponent(id, 'creature')) {
        this.hobbies.delete(id)
        continue
      }
      if (hobby.skill < MAX_SKILL) {
        hobby.skill = Math.min(MAX_SKILL, hobby.skill + SKILL_GAIN)
      }
      hobby.lastPracticed = tick
      // Find social partner with same hobby nearby
      hobby.socialPartner = null
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      for (const [otherId, otherHobby] of this.hobbies) {
        if (otherId === id || otherHobby.hobby !== hobby.hobby) continue
        const oPos = em.getComponent<PositionComponent>(otherId, 'position')
        if (!oPos) continue
        if (Math.abs(pos.x - oPos.x) <= HOBBY_RANGE && Math.abs(pos.y - oPos.y) <= HOBBY_RANGE) {
          hobby.socialPartner = otherId
          hobby.enjoyment = Math.min(25, hobby.enjoyment + 1)
          break
        }
      }
    }
  }

  private pickHobby(): HobbyType {
    let r = Math.random() * HOBBY_TOTAL
    for (const h of HOBBY_LIST) {
      r -= HOBBY_WEIGHTS[h]
      if (r <= 0) return h
    }
    return 'fishing'
  }

  getHobby(id: EntityId): CreatureHobby | undefined {
    return this.hobbies.get(id)
  }

  getHobbies(): Map<EntityId, CreatureHobby> {
    return this.hobbies
  }

  getHobbyCount(): number {
    return this.hobbies.size
  }
}
