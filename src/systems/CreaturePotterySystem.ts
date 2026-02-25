// Creature Pottery System (v3.61) - Creatures craft pottery for storage and art
// Pottery enables food preservation, water storage, and cultural expression

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type PotteryStyle = 'coiled' | 'wheel-thrown' | 'slab-built' | 'pinched' | 'molded' | 'glazed'
export type PotteryUse = 'storage' | 'cooking' | 'ceremonial' | 'trade' | 'decorative' | 'funerary'

export interface Pottery {
  id: number
  crafterId: number
  style: PotteryStyle
  use: PotteryUse
  quality: number
  durability: number
  tradeValue: number
  tick: number
}

const CHECK_INTERVAL = 1200
const CRAFT_CHANCE = 0.005
const MAX_POTTERY = 100
const SKILL_GROWTH = 0.07

const STYLES: PotteryStyle[] = ['coiled', 'wheel-thrown', 'slab-built', 'pinched', 'molded', 'glazed']
const USES: PotteryUse[] = ['storage', 'cooking', 'ceremonial', 'trade', 'decorative', 'funerary']

export class CreaturePotterySystem {
  private pottery: Pottery[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.pottery.length >= MAX_POTTERY) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 14) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 15)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const style = STYLES[Math.floor(Math.random() * STYLES.length)]
      const use = USES[Math.floor(Math.random() * USES.length)]

      this.pottery.push({
        id: this.nextId++,
        crafterId: eid,
        style,
        use,
        quality: skill * (0.5 + Math.random() * 0.5),
        durability: 50 + skill * 0.4,
        tradeValue: skill * 0.6,
        tick,
      })
    }

    // Degrade old pottery
    const cutoff = tick - 60000
    for (let i = this.pottery.length - 1; i >= 0; i--) {
      const p = this.pottery[i]
      p.durability -= 0.02
      if (p.durability <= 0 || p.tick < cutoff) {
        this.pottery.splice(i, 1)
      }
    }
  }

  getPottery(): readonly Pottery[] { return this.pottery }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
