// Creature Calligraphy System (v3.54) - Creatures develop writing skills
// Calligraphy records history, boosts culture, and can be traded as art

import { EntityManager } from '../ecs/Entity'

export type ScriptStyle = 'pictographic' | 'cuneiform' | 'runic' | 'flowing' | 'geometric' | 'symbolic'

export interface CalligraphyWork {
  id: number
  authorId: number
  style: ScriptStyle
  skill: number        // 0-100
  culturalValue: number
  content: string
  preserved: boolean   // survives author's death
  tick: number
}

const CHECK_INTERVAL = 1200
const WRITE_CHANCE = 0.005
const MAX_WORKS = 100
const SKILL_GROWTH = 0.08

const STYLES: ScriptStyle[] = ['pictographic', 'cuneiform', 'runic', 'flowing', 'geometric', 'symbolic']

const CONTENTS = ['battle record', 'harvest log', 'star map', 'genealogy', 'prayer', 'trade ledger', 'myth', 'law decree']

export class CreatureCalligraphySystem {
  private works: CalligraphyWork[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Creatures write
    for (const eid of creatures) {
      if (this.works.length >= MAX_WORKS) break
      if (Math.random() > WRITE_CHANCE) continue

      // Get or init skill
      let skill = this.skillMap.get(eid) ?? (10 + Math.random() * 20)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const style = STYLES[Math.floor(Math.random() * STYLES.length)]
      this.works.push({
        id: this.nextId++,
        authorId: eid,
        style,
        skill,
        culturalValue: skill * (0.5 + Math.random() * 0.5),
        content: CONTENTS[Math.floor(Math.random() * CONTENTS.length)],
        preserved: skill > 60,
        tick,
      })
    }

    // Clean up old non-preserved works
    const cutoff = tick - 8000
    for (let _i = this.works.length - 1; _i >= 0; _i--) { if (!((w) => w.preserved || w.tick > cutoff)(this.works[_i])) this.works.splice(_i, 1) }

    // Clean skill map for dead creatures
    for (const [eid] of this.skillMap) {
      if (!em.hasComponent(eid, 'creature')) this.skillMap.delete(eid)
    }
  }

  getWorks(): CalligraphyWork[] {
    return this.works
  }

  private _authorWorksBuf: CalligraphyWork[] = []
  getByAuthor(entityId: number): CalligraphyWork[] {
    this._authorWorksBuf.length = 0
    for (const w of this.works) { if (w.authorId === entityId) this._authorWorksBuf.push(w) }
    return this._authorWorksBuf
  }
}
