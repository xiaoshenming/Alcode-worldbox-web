// Creature Saddler System (v3.223) - Saddlers craft saddles and leather riding gear
// Leatherworkers who equip mounts and improve cavalry effectiveness

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type SaddleStyle = 'western' | 'english' | 'military' | 'ceremonial'

export interface Saddler {
  id: number
  entityId: number
  skill: number
  saddlesMade: number
  style: SaddleStyle
  durability: number
  comfort: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_SADDLERS = 36
const SKILL_GROWTH = 0.06

const STYLES: SaddleStyle[] = ['western', 'english', 'military', 'ceremonial']

export class CreatureSaddlerSystem {
  private saddlers: Saddler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.saddlers.length >= MAX_SADDLERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 9)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const styleIdx = Math.min(3, Math.floor(skill / 25))
      const saddlesMade = 1 + Math.floor(skill / 20)
      const durability = 20 + skill * 0.6 + Math.random() * 15

      this.saddlers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        saddlesMade,
        style: STYLES[styleIdx],
        durability: Math.min(100, durability),
        comfort: 10 + skill * 0.7 + Math.random() * 10,
        tick,
      })
    }

    const cutoff = tick - 48000
    for (let i = this.saddlers.length - 1; i >= 0; i--) {
      if (this.saddlers[i].tick < cutoff) {
        this.saddlers.splice(i, 1)
      }
    }
  }

  getSaddlers(): readonly Saddler[] { return this.saddlers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
