// Creature Scribe System (v3.104) - Scribes record civilization history
// Scribes document events, battles, and discoveries for their civilization

import { EntityManager, EntityId, CreatureComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'

export type RecordType = 'battle' | 'discovery' | 'founding' | 'disaster' | 'treaty'

export interface HistoricalRecord {
  id: number
  scribeId: number
  type: RecordType
  importance: number
  accuracy: number
  civId: number
  tick: number
}

const CHECK_INTERVAL = 2500
const RECORD_CHANCE = 0.005
const MAX_RECORDS = 80

const RECORD_TYPES: RecordType[] = ['battle', 'discovery', 'founding', 'disaster', 'treaty']

export class CreatureScribeSystem {
  private records: HistoricalRecord[] = []
  private nextId = 1
  private lastCheck = 0
  private _scribesBuf: EntityId[] = []

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Scribes create records
    if (this.records.length < MAX_RECORDS && Math.random() < RECORD_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      const scribes = this._scribesBuf; scribes.length = 0
      for (const eid of entities) {
        const c = em.getComponent<CreatureComponent>(eid, 'creature')
        if (c && c.age > 10) scribes.push(eid)
      }
      if (scribes.length > 0) {
        const scribeId = scribes[Math.floor(Math.random() * scribes.length)]
        const type = RECORD_TYPES[Math.floor(Math.random() * RECORD_TYPES.length)]
        const cm = em.getComponent<CivMemberComponent>(scribeId, 'civMember')
        this.records.push({
          id: this.nextId++,
          scribeId,
          type,
          importance: Math.floor(Math.random() * 100),
          accuracy: 40 + Math.floor(Math.random() * 60),
          civId: cm?.civId ?? 0,
          tick,
        })
      }
    }

    // Accuracy degrades over time for old records
    for (const r of this.records) {
      const age = tick - r.tick
      if (age > 50000) {
        r.accuracy = Math.max(10, r.accuracy - 0.1)
      }
    }

    // Cap records
    if (this.records.length > MAX_RECORDS) {
      this.records.sort((a, b) => b.importance - a.importance)
      this.records.length = MAX_RECORDS
    }
  }

  getRecords(): readonly HistoricalRecord[] { return this.records }
}
