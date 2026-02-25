// Creature Falconer System (v3.196) - Falconers train birds of prey for hunting and scouting
// Trained raptors provide food, reconnaissance, and prestige

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RaptorType = 'hawk' | 'falcon' | 'eagle' | 'owl'

export interface Falconer {
  id: number
  entityId: number
  skill: number
  raptorType: RaptorType
  huntSuccess: number
  scoutRange: number
  bondsStrength: number
  tick: number
}

const CHECK_INTERVAL = 1200
const TRAIN_CHANCE = 0.005
const MAX_FALCONERS = 40
const SKILL_GROWTH = 0.09

const RAPTOR_TYPES: RaptorType[] = ['hawk', 'falcon', 'eagle', 'owl']

export class CreatureFalconerSystem {
  private falconers: Falconer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.falconers.length >= MAX_FALCONERS) break
      if (Math.random() > TRAIN_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const raptorType = RAPTOR_TYPES[Math.floor(Math.random() * RAPTOR_TYPES.length)]
      const huntSuccess = 15 + skill * 0.7 + Math.random() * 10
      const scoutRange = 3 + Math.floor(skill / 10)

      this.falconers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        raptorType,
        huntSuccess: Math.min(100, huntSuccess),
        scoutRange,
        bondsStrength: 10 + skill * 0.5,
        tick,
      })
    }

    const cutoff = tick - 46000
    for (let i = this.falconers.length - 1; i >= 0; i--) {
      if (this.falconers[i].tick < cutoff) {
        this.falconers.splice(i, 1)
      }
    }
  }

  getFalconers(): readonly Falconer[] { return this.falconers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
