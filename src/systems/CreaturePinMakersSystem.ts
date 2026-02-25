// Creature Pin Makers System (v3.365) - Pin crafting artisans
// Artisans who manufacture pins from brass, steel, and bone

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type PinMaterial = 'brass' | 'steel' | 'bone' | 'silver'

export interface PinMaker {
  id: number
  entityId: number
  skill: number
  pinsMade: number
  material: PinMaterial
  sharpness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1380
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.059

const MATERIALS: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']

export class CreaturePinMakersSystem {
  private makers: PinMaker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.makers.length >= MAX_MAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const matIdx = Math.min(3, Math.floor(skill / 25))
      const pinsMade = 15 + Math.floor(skill / 3)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        pinsMade,
        material: MATERIALS[matIdx],
        sharpness: 18 + skill * 0.69,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 50500
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): PinMaker[] { return this.makers }
}
