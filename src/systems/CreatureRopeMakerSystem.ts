// Creature Rope Maker System (v3.206) - Rope makers twist fibers into ropes and cordage
// Skilled rope makers produce stronger, longer ropes essential for construction and sailing

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RopeType = 'hemp' | 'silk' | 'wire' | 'chain'

export interface RopeMaker {
  id: number
  entityId: number
  skill: number
  ropesMade: number
  ropeType: RopeType
  tensileStrength: number
  length: number
  tick: number
}

const CHECK_INTERVAL = 1150
const CRAFT_CHANCE = 0.006
const MAX_ROPEMAKERS = 50
const SKILL_GROWTH = 0.08

const ROPE_TYPES: RopeType[] = ['hemp', 'silk', 'wire', 'chain']

export class CreatureRopeMakerSystem {
  private ropeMakers: RopeMaker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.ropeMakers.length >= MAX_ROPEMAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const ropeType = ROPE_TYPES[Math.floor(Math.random() * ROPE_TYPES.length)]
      const ropesMade = 2 + Math.floor(skill / 8)
      const tensileStrength = 15 + skill * 0.7 + Math.random() * 15
      const length = 5 + Math.floor(skill / 4) + Math.random() * 10

      this.ropeMakers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        ropesMade,
        ropeType,
        tensileStrength: Math.min(100, tensileStrength),
        length: Math.min(100, length),
        tick,
      })
    }

    const cutoff = tick - 43000
    for (let i = this.ropeMakers.length - 1; i >= 0; i--) {
      if (this.ropeMakers[i].tick < cutoff) {
        this.ropeMakers.splice(i, 1)
      }
    }
  }

  getRopeMakers(): readonly RopeMaker[] { return this.ropeMakers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
