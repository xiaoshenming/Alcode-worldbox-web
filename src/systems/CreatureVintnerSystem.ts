// Creature Vintner System (v3.208) - Vintners cultivate grapes and produce wines
// Master vintners develop renowned vintages that boost cultural prestige

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WineVariety = 'red' | 'white' | 'rosé' | 'sparkling'

export interface Vintner {
  id: number
  entityId: number
  skill: number
  barrelsProduced: number
  wineVariety: WineVariety
  vintage: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1250
const CRAFT_CHANCE = 0.006
const MAX_VINTNERS = 45
const SKILL_GROWTH = 0.08

const WINE_VARIETIES: WineVariety[] = ['red', 'white', 'rosé', 'sparkling']

export class CreatureVintnerSystem {
  private vintners: Vintner[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.vintners.length >= MAX_VINTNERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const wineVariety = WINE_VARIETIES[Math.floor(Math.random() * WINE_VARIETIES.length)]
      const barrelsProduced = 1 + Math.floor(skill / 10)
      const vintage = Math.floor(tick / 10000) + Math.floor(Math.random() * 5)
      const reputation = 10 + skill * 0.6 + Math.random() * 15

      this.vintners.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        barrelsProduced,
        wineVariety,
        vintage,
        reputation: Math.min(100, reputation),
        tick,
      })
    }

    const cutoff = tick - 45000
    for (let i = this.vintners.length - 1; i >= 0; i--) {
      if (this.vintners[i].tick < cutoff) {
        this.vintners.splice(i, 1)
      }
    }
  }

  getVintners(): readonly Vintner[] { return this.vintners }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
