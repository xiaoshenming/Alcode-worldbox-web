// Creature Engraver System (v3.198) - Engravers carve inscriptions on stone, metal, and wood
// Their work preserves history, marks territory, and creates decorative art

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EngravingMedium = 'stone' | 'metal' | 'wood' | 'bone'

export interface Engraver {
  id: number
  entityId: number
  skill: number
  worksCompleted: number
  medium: EngravingMedium
  detail: number
  prestige: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_ENGRAVERS = 45
const SKILL_GROWTH = 0.07

const MEDIUMS: EngravingMedium[] = ['stone', 'metal', 'wood', 'bone']

export class CreatureEngraverSystem {
  private engravers: Engraver[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.engravers.length >= MAX_ENGRAVERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (4 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const medium = MEDIUMS[Math.floor(Math.random() * MEDIUMS.length)]
      const worksCompleted = 1 + Math.floor(skill / 12)
      const detail = 10 + skill * 0.8 + Math.random() * 10
      const prestige = skill * 0.5 + worksCompleted * 2

      this.engravers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        worksCompleted,
        medium,
        detail: Math.min(100, detail),
        prestige: Math.min(100, prestige),
        tick,
      })
    }

    const cutoff = tick - 43000
    for (let i = this.engravers.length - 1; i >= 0; i--) {
      if (this.engravers[i].tick < cutoff) {
        this.engravers.splice(i, 1)
      }
    }
  }

  getEngravers(): readonly Engraver[] { return this.engravers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
