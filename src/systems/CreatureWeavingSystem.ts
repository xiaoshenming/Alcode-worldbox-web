// Creature Weaving System (v3.66) - Creatures learn textile weaving
// Woven goods provide warmth, trade value, and cultural identity

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FabricType = 'linen' | 'wool' | 'silk' | 'cotton' | 'hemp' | 'tapestry'
export type PatternStyle = 'plain' | 'striped' | 'checkered' | 'floral' | 'geometric' | 'narrative'

export interface WovenGood {
  id: number
  weaverId: number
  fabric: FabricType
  pattern: PatternStyle
  quality: number
  warmth: number
  tradeValue: number
  tick: number
}

const CHECK_INTERVAL = 1200
const WEAVE_CHANCE = 0.005
const MAX_GOODS = 100
const SKILL_GROWTH = 0.07

const FABRICS: FabricType[] = ['linen', 'wool', 'silk', 'cotton', 'hemp', 'tapestry']
const PATTERNS: PatternStyle[] = ['plain', 'striped', 'checkered', 'floral', 'geometric', 'narrative']

export class CreatureWeavingSystem {
  private goods: WovenGood[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.goods.length >= MAX_GOODS) break
      if (Math.random() > WEAVE_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 13) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 15)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const fabric = FABRICS[Math.floor(Math.random() * FABRICS.length)]
      const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
      const quality = skill * (0.5 + Math.random() * 0.5)

      this.goods.push({
        id: this.nextId++,
        weaverId: eid,
        fabric,
        pattern,
        quality,
        warmth: quality * 0.4 + (fabric === 'wool' ? 20 : 0),
        tradeValue: quality * 0.6 + (pattern === 'narrative' ? 15 : 0),
        tick,
      })
    }

    // Degrade old goods
    const cutoff = tick - 55000
    for (let i = this.goods.length - 1; i >= 0; i--) {
      if (this.goods[i].tick < cutoff) {
        this.goods.splice(i, 1)
      }
    }
  }

}
