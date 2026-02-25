// Creature Potters System (v3.278) - Clay pottery craftsmen
// Artisans who shape clay into vessels, containers, and decorative ceramics

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type PotteryType = 'bowl' | 'jar' | 'vase' | 'urn'

export interface Potter {
  id: number
  entityId: number
  skill: number
  potteryMade: number
  potteryType: PotteryType
  glazeQuality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_POTTERS = 34
const SKILL_GROWTH = 0.07

const POTTERY_TYPES: PotteryType[] = ['bowl', 'jar', 'vase', 'urn']

export class CreaturePottersSystem {
  private potters: Potter[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.potters.length >= MAX_POTTERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const potteryMade = 1 + Math.floor(skill / 8)

      this.potters.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        potteryMade,
        potteryType: POTTERY_TYPES[typeIdx],
        glazeQuality: 15 + skill * 0.7,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.potters.length - 1; i >= 0; i--) {
      if (this.potters[i].tick < cutoff) this.potters.splice(i, 1)
    }
  }

  getPotters(): Potter[] { return this.potters }
}
