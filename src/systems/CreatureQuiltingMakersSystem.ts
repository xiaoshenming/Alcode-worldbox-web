// Creature Quilting Makers System (v3.419) - Quilting artisans
// Skilled workers who create quilted textiles with layered stitching

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type QuiltType = 'patchwork' | 'applique_quilt' | 'wholecloth' | 'trapunto'

export interface QuiltingMaker {
  id: number
  entityId: number
  skill: number
  quiltsMade: number
  quiltType: QuiltType
  stitchDensity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1490
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.051

const QUILT_TYPES: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']

export class CreatureQuiltingMakersSystem {
  private makers: QuiltingMaker[] = []
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

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const quiltsMade = 2 + Math.floor(skill / 9)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        quiltsMade,
        quiltType: QUILT_TYPES[typeIdx],
        stitchDensity: 15 + skill * 0.68,
        reputation: 10 + skill * 0.77,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): QuiltingMaker[] { return this.makers }
}
