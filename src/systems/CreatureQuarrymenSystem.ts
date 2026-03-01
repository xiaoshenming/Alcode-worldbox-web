// Creature Quarrymen System (v3.286) - Stone quarry workers
// Laborers who extract and shape stone blocks for construction

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type StoneType = 'limestone' | 'granite' | 'marble' | 'slate'

export interface Quarryman {
  id: number
  entityId: number
  skill: number
  blocksExtracted: number
  stoneType: StoneType
  precision: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_QUARRYMEN = 34
const SKILL_GROWTH = 0.07

const STONE_TYPES: StoneType[] = ['limestone', 'granite', 'marble', 'slate']

export class CreatureQuarrymenSystem {
  private quarrymen: Quarryman[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.quarrymen.length >= MAX_QUARRYMEN) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const blocksExtracted = 1 + Math.floor(skill / 8)

      this.quarrymen.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        blocksExtracted,
        stoneType: STONE_TYPES[typeIdx],
        precision: 20 + skill * 0.65,
        reputation: 12 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.quarrymen.length - 1; i >= 0; i--) {
      if (this.quarrymen[i].tick < cutoff) this.quarrymen.splice(i, 1)
    }
  }

}
