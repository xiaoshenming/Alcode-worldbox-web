// Creature Alliance System (v2.33) - Individual creatures form personal alliances
// Friendships and alliances that cross civilization boundaries
// Allied creatures help each other in combat and share resources

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export interface PersonalAlliance {
  id: number
  memberA: EntityId
  memberB: EntityId
  strength: number      // 0-100 bond strength
  formedAt: number
  lastInteraction: number
  type: 'friendship' | 'blood_oath' | 'mentor' | 'rival_respect'
}

const CHECK_INTERVAL = 800
const DECAY_INTERVAL = 1200
const MAX_ALLIANCES = 100
const ALLIANCE_RANGE = 12
const BOND_GAIN = 3
const BOND_DECAY = 1
const MIN_BOND = 10

const ALLIANCE_TYPES: PersonalAlliance['type'][] = ['friendship', 'blood_oath', 'mentor', 'rival_respect']

let nextAllianceId = 1

export class CreatureAllianceSystem {
  private alliances: PersonalAlliance[] = []
  private lastCheck = 0
  private lastDecay = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.formAlliances(em, tick)
    }
    if (tick - this.lastDecay >= DECAY_INTERVAL) {
      this.lastDecay = tick
      this.decayAlliances(em, tick)
    }
  }

  private formAlliances(em: EntityManager, tick: number): void {
    if (this.alliances.length >= MAX_ALLIANCES) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')
    const creatureList = [...creatures]
    // Sample random pairs
    for (let attempt = 0; attempt < 5; attempt++) {
      if (this.alliances.length >= MAX_ALLIANCES) break
      if (creatureList.length < 2) break
      const iA = Math.floor(Math.random() * creatureList.length)
      const iB = Math.floor(Math.random() * creatureList.length)
      if (iA === iB) continue
      const idA = creatureList[iA], idB = creatureList[iB]
      if (this.hasAlliance(idA, idB)) continue
      const posA = em.getComponent<PositionComponent>(idA, 'position')
      const posB = em.getComponent<PositionComponent>(idB, 'position')
      if (!posA || !posB) continue
      const dx = posA.x - posB.x, dy = posA.y - posB.y
      if (dx * dx + dy * dy > ALLIANCE_RANGE * ALLIANCE_RANGE) continue
      if (Math.random() > 0.1) continue
      const type = ALLIANCE_TYPES[Math.floor(Math.random() * ALLIANCE_TYPES.length)]
      this.alliances.push({
        id: nextAllianceId++,
        memberA: idA,
        memberB: idB,
        strength: 20 + Math.floor(Math.random() * 30),
        formedAt: tick,
        lastInteraction: tick,
        type,
      })
    }
  }

  private decayAlliances(em: EntityManager, tick: number): void {
    this.alliances = this.alliances.filter(a => {
      // Remove if either member is dead
      if (!em.getComponent(a.memberA, 'creature') || !em.getComponent(a.memberB, 'creature')) {
        return false
      }
      // Strengthen if nearby
      const posA = em.getComponent<PositionComponent>(a.memberA, 'position')
      const posB = em.getComponent<PositionComponent>(a.memberB, 'position')
      if (posA && posB) {
        const dx = posA.x - posB.x, dy = posA.y - posB.y
        if (dx * dx + dy * dy <= ALLIANCE_RANGE * ALLIANCE_RANGE) {
          a.strength = Math.min(100, a.strength + BOND_GAIN)
          a.lastInteraction = tick
          return true
        }
      }
      // Decay if apart
      a.strength -= BOND_DECAY
      return a.strength >= MIN_BOND
    })
  }

  private hasAlliance(a: EntityId, b: EntityId): boolean {
    return this.alliances.some(al =>
      (al.memberA === a && al.memberB === b) || (al.memberA === b && al.memberB === a)
    )
  }

  getAlliances(): PersonalAlliance[] {
    return this.alliances
  }

  getAlliancesFor(id: EntityId): PersonalAlliance[] {
    return this.alliances.filter(a => a.memberA === id || a.memberB === id)
  }

  getAllianceCount(): number {
    return this.alliances.length
  }
}
