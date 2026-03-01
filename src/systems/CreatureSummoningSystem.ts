// Creature Summoning System (v3.91) - Creatures summon magical beings to fight alongside them
// Summoners conjure elementals, spirits, golems, phantoms, and familiars

import { EntityManager, CreatureComponent, PositionComponent } from '../ecs/Entity'

export type SummonType = 'elemental' | 'spirit' | 'golem' | 'phantom' | 'familiar'

export interface Summon {
  id: number
  type: SummonType
  summonerId: number
  x: number
  y: number
  power: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 1600
const SUMMON_CHANCE = 0.003
const MAX_SUMMONS = 80
const MASTERY_GROWTH = 0.05

const SUMMON_TYPES: SummonType[] = ['elemental', 'spirit', 'golem', 'phantom', 'familiar']

const POWER_BASE: Record<SummonType, number> = {
  elemental: 35, spirit: 20, golem: 45, phantom: 25, familiar: 15,
}

export class CreatureSummoningSystem {
  private summons: Summon[] = []
  private nextId = 1
  private lastCheck = 0
  private masteryMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.summons.length >= MAX_SUMMONS) break
      if (Math.random() > SUMMON_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 15) continue

      const pos = em.getComponent<PositionComponent>(eid, 'position')

      let mastery = this.masteryMap.get(eid) ?? (3 + Math.random() * 7)
      mastery = Math.min(100, mastery + MASTERY_GROWTH)
      this.masteryMap.set(eid, mastery)

      const type = SUMMON_TYPES[Math.floor(Math.random() * SUMMON_TYPES.length)]
      const power = POWER_BASE[type] * (0.5 + mastery / 100)

      this.summons.push({
        id: this.nextId++,
        type,
        summonerId: eid,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        power,
        duration: 3000 + Math.floor(mastery * 50),
        tick,
      })
    }

    // Expire old summons
    const cutoff = tick - 30000
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const s = this.summons[i]
      if (s.tick < cutoff || tick - s.tick > s.duration) {
        this.summons.splice(i, 1)
      }
    }
  }

}
