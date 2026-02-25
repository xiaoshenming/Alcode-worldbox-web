// Creature Telepathy System (v3.74) - Some creatures develop telepathic abilities
// Telepaths can sense danger, communicate silently, and influence others

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type TelepathicAbility = 'danger_sense' | 'mind_speak' | 'empathy' | 'suggestion' | 'mind_shield' | 'foresight'

export interface TelepathicLink {
  id: number
  senderId: number
  receiverId: number
  ability: TelepathicAbility
  strength: number
  tick: number
}

const CHECK_INTERVAL = 1000
const AWAKEN_CHANCE = 0.003
const MAX_LINKS = 120
const POWER_GROWTH = 0.06

const ABILITIES: TelepathicAbility[] = ['danger_sense', 'mind_speak', 'empathy', 'suggestion', 'mind_shield', 'foresight']

export class CreatureTelepathySystem {
  private links: TelepathicLink[] = []
  private nextId = 1
  private lastCheck = 0
  private powerMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.links.length >= MAX_LINKS) break
      if (Math.random() > AWAKEN_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 15) continue

      let power = this.powerMap.get(eid) ?? (3 + Math.random() * 10)
      power = Math.min(100, power + POWER_GROWTH)
      this.powerMap.set(eid, power)

      // Find a nearby creature to link with
      const others = creatures.filter(o => o !== eid)
      if (others.length === 0) continue
      const target = others[Math.floor(Math.random() * others.length)]

      const ability = ABILITIES[Math.floor(Math.random() * ABILITIES.length)]

      this.links.push({
        id: this.nextId++,
        senderId: eid,
        receiverId: target,
        ability,
        strength: power * (0.4 + Math.random() * 0.6),
        tick,
      })
    }

    const cutoff = tick - 30000
    for (let i = this.links.length - 1; i >= 0; i--) {
      if (this.links[i].tick < cutoff) {
        this.links.splice(i, 1)
      }
    }
  }

  getLinks(): readonly TelepathicLink[] { return this.links }
  getPower(eid: number): number { return this.powerMap.get(eid) ?? 0 }
}
