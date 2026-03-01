// Creature Bell Founders System (v3.283) - Bell casting craftsmen
// Specialists who cast bronze and iron bells for temples and town squares

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BellSize = 'handbell' | 'chapel' | 'church' | 'cathedral'

export interface BellFounder {
  id: number
  entityId: number
  skill: number
  bellsCast: number
  bellSize: BellSize
  toneQuality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1500
const CRAFT_CHANCE = 0.004
const MAX_FOUNDERS = 28
const SKILL_GROWTH = 0.06

const BELL_SIZES: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']

export class CreatureBellFoundersSystem {
  private founders: BellFounder[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.founders.length >= MAX_FOUNDERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 14) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const sizeIdx = Math.min(3, Math.floor(skill / 25))
      const bellsCast = 1 + Math.floor(skill / 12)

      this.founders.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        bellsCast,
        bellSize: BELL_SIZES[sizeIdx],
        toneQuality: 20 + skill * 0.7,
        reputation: 15 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 58000
    for (let i = this.founders.length - 1; i >= 0; i--) {
      if (this.founders[i].tick < cutoff) this.founders.splice(i, 1)
    }
  }

}
