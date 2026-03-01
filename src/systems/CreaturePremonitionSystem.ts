// Creature Premonition System (v3.79) - Creatures sense future events
// Premonitions warn of disasters, battles, and opportunities

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type VisionType = 'disaster' | 'battle' | 'prosperity' | 'death' | 'discovery' | 'migration'

export interface Premonition {
  id: number
  seerId: number
  vision: VisionType
  clarity: number
  urgency: number
  heeded: boolean
  tick: number
}

const CHECK_INTERVAL = 1300
const VISION_CHANCE = 0.003
const MAX_VISIONS = 100
const GIFT_GROWTH = 0.05

const VISIONS: VisionType[] = ['disaster', 'battle', 'prosperity', 'death', 'discovery', 'migration']

export class CreaturePremonitionSystem {
  private visions: Premonition[] = []
  private nextId = 1
  private lastCheck = 0
  private giftMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.visions.length >= MAX_VISIONS) break
      if (Math.random() > VISION_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 20) continue

      let gift = this.giftMap.get(eid) ?? (2 + Math.random() * 10)
      gift = Math.min(100, gift + GIFT_GROWTH)
      this.giftMap.set(eid, gift)

      const vision = VISIONS[Math.floor(Math.random() * VISIONS.length)]
      const clarity = gift * (0.3 + Math.random() * 0.7)

      this.visions.push({
        id: this.nextId++,
        seerId: eid,
        vision,
        clarity,
        urgency: vision === 'disaster' || vision === 'death' ? clarity * 1.5 : clarity * 0.6,
        heeded: Math.random() < clarity / 100,
        tick,
      })
    }

    const cutoff = tick - 25000
    for (let i = this.visions.length - 1; i >= 0; i--) {
      if (this.visions[i].tick < cutoff) this.visions.splice(i, 1)
    }
  }

}
