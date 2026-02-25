// Creature Glassblowing System (v3.76) - Creatures learn glass crafting
// Glass items serve as art, tools, windows, and luxury trade goods

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GlassItem = 'vase' | 'window' | 'lens' | 'bottle' | 'ornament' | 'mirror'
export type GlassColor = 'clear' | 'amber' | 'cobalt' | 'emerald' | 'ruby' | 'opal'

export interface GlassWork {
  id: number
  crafterId: number
  item: GlassItem
  color: GlassColor
  quality: number
  beauty: number
  tradeValue: number
  tick: number
}

const CHECK_INTERVAL = 1100
const CRAFT_CHANCE = 0.004
const MAX_WORKS = 90
const SKILL_GROWTH = 0.07

const ITEMS: GlassItem[] = ['vase', 'window', 'lens', 'bottle', 'ornament', 'mirror']
const COLORS: GlassColor[] = ['clear', 'amber', 'cobalt', 'emerald', 'ruby', 'opal']

export class CreatureGlassblowingSystem {
  private works: GlassWork[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.works.length >= MAX_WORKS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 14) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 12)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const item = ITEMS[Math.floor(Math.random() * ITEMS.length)]
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const quality = skill * (0.5 + Math.random() * 0.5)

      this.works.push({
        id: this.nextId++,
        crafterId: eid,
        item, color, quality,
        beauty: quality * 0.7 + (item === 'ornament' ? 15 : 0),
        tradeValue: quality * 0.5 + (color === 'opal' ? 20 : 0),
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.works.length - 1; i >= 0; i--) {
      if (this.works[i].tick < cutoff) this.works.splice(i, 1)
    }
  }

  getWorks(): readonly GlassWork[] { return this.works }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
