// Creature Farrier System (v3.228) - Farriers shoe horses and maintain hooves
// Blacksmiths specialized in equine care, essential for cavalry and transport

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ShoeType = 'iron' | 'steel' | 'aluminum' | 'therapeutic'

export interface Farrier {
  id: number
  entityId: number
  skill: number
  horsesShod: number
  shoeType: ShoeType
  fitQuality: number
  hoofHealth: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_FARRIERS = 34
const SKILL_GROWTH = 0.06

const SHOE_TYPES: ShoeType[] = ['iron', 'steel', 'aluminum', 'therapeutic']

export class CreatureFarrierSystem {
  private farriers: Farrier[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.farriers.length >= MAX_FARRIERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 9)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const shoeIdx = Math.min(3, Math.floor(skill / 25))
      const horsesShod = 1 + Math.floor(skill / 12)
      const fitQuality = 20 + skill * 0.65 + Math.random() * 12

      this.farriers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        horsesShod,
        shoeType: SHOE_TYPES[shoeIdx],
        fitQuality: Math.min(100, fitQuality),
        hoofHealth: 15 + skill * 0.7 + Math.random() * 10,
        tick,
      })
    }

    const cutoff = tick - 47000
    for (let i = this.farriers.length - 1; i >= 0; i--) {
      if (this.farriers[i].tick < cutoff) {
        this.farriers.splice(i, 1)
      }
    }
  }

}
