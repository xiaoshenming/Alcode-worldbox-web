// Creature Chandlers System (v3.326) - Candle making craftsmen
// Artisans who craft candles from tallow, beeswax, and other materials

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WaxType = 'tallow' | 'beeswax' | 'bayberry' | 'spermaceti'

export interface Chandler {
  id: number
  entityId: number
  skill: number
  candlesMade: number
  waxType: WaxType
  burnQuality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.060

const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']

export class CreatureChandlersSystem {
  private makers: Chandler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.makers.length >= MAX_MAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const candlesMade = 1 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        candlesMade,
        waxType: WAX_TYPES[typeIdx],
        burnQuality: 18 + skill * 0.65,
        reputation: 10 + skill * 0.78,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): Chandler[] { return this.makers }
}
