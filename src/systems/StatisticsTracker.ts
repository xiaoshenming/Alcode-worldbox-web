import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export interface DataPoint {
  tick: number
  value: number
}

export interface StatSeries {
  label: string
  color: string
  data: DataPoint[]
}

const SAMPLE_INTERVAL = 300
const MAX_SAMPLES = 200

export class StatisticsTracker {
  private totalPopHistory: DataPoint[] = []
  private civPopHistory: Map<number, StatSeries> = new Map()
  private civTerritoryHistory: Map<number, StatSeries> = new Map()
  private civTechHistory: Map<number, StatSeries> = new Map()

  private totalBirths = 0
  private totalDeaths = 0
  private totalWars = 0
  private totalPeaces = 0
  private peakPopulation = 0

  private lastSampleTick = -SAMPLE_INTERVAL

  recordEvent(type: 'birth' | 'death' | 'war' | 'peace', count = 1): void {
    switch (type) {
      case 'birth': this.totalBirths += count; break
      case 'death': this.totalDeaths += count; break
      case 'war': this.totalWars += count; break
      case 'peace': this.totalPeaces += count; break
    }
  }

  update(tick: number, civManager: CivManager, em: EntityManager): void {
    if (tick - this.lastSampleTick < SAMPLE_INTERVAL) return
    this.lastSampleTick = tick

    // Total population from all civs
    let totalPop = 0
    for (const [, civ] of civManager.civilizations) {
      totalPop += civ.population
    }
    if (totalPop > this.peakPopulation) this.peakPopulation = totalPop
    this.pushPoint(this.totalPopHistory, tick, totalPop)

    // Per-civ sampling
    for (const [civId, civ] of civManager.civilizations) {
      // Population
      if (!this.civPopHistory.has(civId)) {
        this.civPopHistory.set(civId, { label: civ.name, color: civ.color, data: [] })
      }
      const popSeries = this.civPopHistory.get(civId)
      if (!popSeries) continue
      popSeries.label = civ.name
      popSeries.color = civ.color
      this.pushPoint(popSeries.data, tick, civ.population)

      // Territory
      if (!this.civTerritoryHistory.has(civId)) {
        this.civTerritoryHistory.set(civId, { label: civ.name, color: civ.color, data: [] })
      }
      const terrSeries = this.civTerritoryHistory.get(civId)
      if (!terrSeries) continue
      terrSeries.label = civ.name
      terrSeries.color = civ.color
      this.pushPoint(terrSeries.data, tick, civ.territory.size)

      // Tech level
      if (!this.civTechHistory.has(civId)) {
        this.civTechHistory.set(civId, { label: civ.name, color: civ.color, data: [] })
      }
      const techSeries = this.civTechHistory.get(civId)
      if (!techSeries) continue
      techSeries.label = civ.name
      techSeries.color = civ.color
      this.pushPoint(techSeries.data, tick, civ.techLevel)
    }

    // Prune dead civs that no longer exist
    this.pruneDeadCivs(civManager)
  }

  getPopulationHistory(): StatSeries[] {
    const total: StatSeries = { label: 'Total', color: '#ffffff', data: this.totalPopHistory }
    return [total, ...this.civPopHistory.values()]
  }

  getTerritoryHistory(): StatSeries[] {
    return [...this.civTerritoryHistory.values()]
  }

  getTechHistory(): StatSeries[] {
    return [...this.civTechHistory.values()]
  }

  getSummary(): {
    totalBirths: number
    totalDeaths: number
    totalWars: number
    peakPopulation: number
  } {
    return {
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      totalWars: this.totalWars,
      peakPopulation: this.peakPopulation,
    }
  }

  private pushPoint(arr: DataPoint[], tick: number, value: number): void {
    arr.push({ tick, value })
    if (arr.length > MAX_SAMPLES) {
      arr.splice(0, arr.length - MAX_SAMPLES)
    }
  }

  private pruneDeadCivs(civManager: CivManager): void {
    for (const civId of this.civPopHistory.keys()) {
      if (!civManager.civilizations.has(civId)) {
        this.civPopHistory.delete(civId)
        this.civTerritoryHistory.delete(civId)
        this.civTechHistory.delete(civId)
      }
    }
  }
}
