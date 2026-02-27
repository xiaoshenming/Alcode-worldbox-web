// Diplomatic Census System (v3.28) - Civilizations conduct population censuses
// Census data influences diplomatic power and resource allocation

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export interface Census {
  id: number
  civId: number
  population: number
  warriors: number
  workers: number
  elders: number
  growthRate: number   // percentage
  tick: number
}

const CHECK_INTERVAL = 2000
const CENSUS_CHANCE = 0.04
const MAX_RECORDS = 50

export class DiplomaticCensusSystem {
  private records: Census[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.conductCensus(civManager, tick)
    this.cleanup()
  }

  private conductCensus(civManager: CivManager, tick: number): void {
    if (!civManager?.civilizations) return

    for (const civ of civManager.civilizations.values()) {
      if (Math.random() > CENSUS_CHANCE) continue
      if (this.records.length >= MAX_RECORDS) break

      const pop = civ.population || 0
      const prevCensus = this.getLatestCensus(civ.id)
      const growthRate = prevCensus
        ? ((pop - prevCensus.population) / Math.max(1, prevCensus.population)) * 100
        : 0

      this.records.push({
        id: this.nextId++,
        civId: civ.id,
        population: pop,
        warriors: Math.floor(pop * (0.1 + Math.random() * 0.2)),
        workers: Math.floor(pop * (0.3 + Math.random() * 0.3)),
        elders: Math.floor(pop * (0.05 + Math.random() * 0.1)),
        growthRate,
        tick,
      })
    }
  }

  private cleanup(): void {
    if (this.records.length > MAX_RECORDS) {
      this.records.sort((a, b) => b.tick - a.tick)
      this.records.length = MAX_RECORDS
    }
  }

  getRecords(): Census[] { return this.records }
  getLatestCensus(civId: number): Census | undefined {
    let latest: Census | undefined
    for (let _i = 0; _i < this.records.length; _i++) {
      const r = this.records[_i]
      if (r.civId === civId && (!latest || r.tick > latest.tick)) latest = r
    }
    return latest
  }
  getCivHistory(civId: number): Census[] {
    const result: Census[] = []
    for (let _i = 0; _i < this.records.length; _i++) {
      if (this.records[_i].civId === civId) result.push(this.records[_i])
    }
    result.sort((a, b) => a.tick - b.tick)
    return result
  }
}
