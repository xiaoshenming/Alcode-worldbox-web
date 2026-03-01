// World Chronicle System - generates narrative history from game events

import { EventLog } from './EventLog'

export interface Chronicle {
  id: number
  tick: number
  year: number
  category: 'war' | 'hero' | 'disaster' | 'civilization' | 'wonder' | 'religion' | 'discovery'
  title: string
  narrative: string
  importance: 1 | 2 | 3
  involvedCivs: number[]
  involvedEntities: number[]
}

export interface WorldSnapshot {
  totalPopulation: number
  totalCities: number
  activeWars: number
  civilizations: { id: number; name: string; population: number; cities: number }[]
  era: string
}

// War name word banks
const WAR_ADJ_MINOR = ['Border', 'Short', 'Bitter', 'Silent', 'Forgotten']
const WAR_ADJ_MAJOR = ['Great', 'Bloody', 'Burning', 'Iron', 'Crimson']
const WAR_ADJ_LEGENDARY = ['Eternal', 'Apocalyptic', 'Cataclysmic', 'Unholy', 'Divine']
const WAR_NOUN = ['War', 'Conflict', 'Crusade', 'Campaign', 'Siege', 'Conquest', 'Uprising']

const MAX_CHRONICLES = 500
const SUMMARY_INTERVAL = 3600

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function tickToYear(tick: number): number {
  return Math.floor(tick / 3600)
}

export class WorldChronicleSystem {
  private chronicles: Chronicle[] = []
  private _chroniclesBuf: Chronicle[] = []
  private _civChroniclesBuf: Chronicle[] = []
  private _civIdsBuf: number[] = []
  private warNames: Map<string, string> = new Map()
  private nextId: number = 0
  private lastSummaryTick: number = 0
  private warStartTicks: Map<string, number> = new Map()

  constructor() {}

  update(tick: number, worldState: WorldSnapshot): void {
    if (tick - this.lastSummaryTick >= SUMMARY_INTERVAL && tick > 0) {
      this.generateWorldSummary(tick, worldState)
      this.lastSummaryTick = tick
    }
    if (tick % 7200 === 0 && worldState.civilizations.length > 0) {
      let strongest = worldState.civilizations[0]
      for (const c of worldState.civilizations) { if (c.population > strongest.population) strongest = c }
      if (strongest.cities >= 3) {
        this.recordCivMilestone(tick, strongest.id, strongest.name,
          `controls ${strongest.cities} cities with ${strongest.population} citizens`)
      }
    }
  }

  recordWar(tick: number, civA: number, civB: number, result: string, civAName?: string, civBName?: string): void {
    const lo = Math.min(civA, civB), hi = Math.max(civA, civB)
    const warKey = `${lo}-${hi}`
    const nameA = civAName ?? `Civilization ${civA}`
    const nameB = civBName ?? `Civilization ${civB}`
    if (!this.warStartTicks.has(warKey)) this.warStartTicks.set(warKey, tick)
    const startTick = this.warStartTicks.get(warKey) ?? tick
    const durationYears = Math.max(1, tickToYear(tick) - tickToYear(startTick))
    if (!this.warNames.has(warKey)) this.warNames.set(warKey, this.generateWarName())
    const warName = this.warNames.get(warKey) ?? this.generateWarName()
    const importance: 1 | 2 | 3 = durationYears >= 10 ? 3 : durationYears >= 3 ? 2 : 1
    const year = tickToYear(tick)
    const narrative = `The ${warName} between ${nameA} and ${nameB} lasted ${durationYears} year${durationYears > 1 ? 's' : ''}. ${result}.`
    this.addChronicle({
      tick, year, category: 'war', title: `${warName} ends`, narrative, importance,
      involvedCivs: [civA, civB], involvedEntities: [],
    })
    this.warStartTicks.delete(warKey)
    this.warNames.delete(warKey)
    EventLog.log('war', `[Chronicle] ${narrative}`, tick)
  }

  recordCivMilestone(tick: number, civId: number, civName: string, milestone: string): void {
    const year = tickToYear(tick)
    const importance: 1 | 2 | 3 = milestone.includes('10') || milestone.includes('peak') ? 3
      : milestone.includes('5') || milestone.includes('cities') ? 2 : 1
    const narrative = `${civName} ${milestone} in Year ${year}.`
    this.addChronicle({
      tick, year, category: 'civilization', title: `${civName} milestone`,
      narrative, importance, involvedCivs: [civId], involvedEntities: [],
    })
    EventLog.log('civ_founded', `[Chronicle] ${narrative}`, tick)
  }

  generateWarName(): string {
    const roll = Math.random()
    const adj = roll < 0.5 ? pick(WAR_ADJ_MINOR) : roll < 0.85 ? pick(WAR_ADJ_MAJOR) : pick(WAR_ADJ_LEGENDARY)
    return `${adj} ${pick(WAR_NOUN)}`
  }

  getChronicles(filter?: { category?: string; minImportance?: number }): Chronicle[] {
    if (!filter?.category && !filter?.minImportance) return this.chronicles
    this._chroniclesBuf.length = 0
    for (const c of this.chronicles) {
      if (filter.category && c.category !== filter.category) continue
      if (filter.minImportance && c.importance < filter.minImportance) continue
      this._chroniclesBuf.push(c)
    }
    return this._chroniclesBuf
  }

  getRecentChronicles(count: number = 10): Chronicle[] {
    return this.chronicles.slice(-count)
  }

  getChroniclesByCiv(civId: number): Chronicle[] {
    this._civChroniclesBuf.length = 0
    for (const c of this.chronicles) { if (c.involvedCivs.includes(civId)) this._civChroniclesBuf.push(c) }
    return this._civChroniclesBuf
  }

  // --- Internal ---

  private addChronicle(data: Omit<Chronicle, 'id'>): void {
    this.chronicles.push({ id: this.nextId++, ...data })
    this.pruneChronicles()
  }

  private pruneChronicles(): void {
    if (this.chronicles.length <= MAX_CHRONICLES) return
    // Remove oldest low-importance first, then medium, then hard trim
    for (const threshold of [1, 2] as const) {
      for (let i = 0; i < this.chronicles.length && this.chronicles.length > MAX_CHRONICLES; i++) {
        if (this.chronicles[i].importance === threshold) {
          this.chronicles.splice(i, 1)
          i--
        }
      }
    }
    if (this.chronicles.length > MAX_CHRONICLES) {
      this.chronicles.splice(0, this.chronicles.length - MAX_CHRONICLES)
    }
  }

  private generateWorldSummary(tick: number, state: WorldSnapshot): void {
    const year = tickToYear(tick)
    const parts = [`Year ${year} (${state.era})`,
      `Pop: ${state.totalPopulation}, Cities: ${state.totalCities}, Wars: ${state.activeWars}`]
    if (state.civilizations.length > 0) {
      let s = state.civilizations[0]
      for (const c of state.civilizations) { if (c.population > s.population) s = c }
      parts.push(`Dominant: ${s.name} (pop ${s.population}, ${s.cities} cities)`)
    }
    const civIds = this._civIdsBuf; civIds.length = 0
    for (const c of state.civilizations) civIds.push(c.id)
    this.addChronicle({
      tick, year, category: 'civilization', title: `Year ${year} summary`,
      narrative: parts.join('. ') + '.', importance: 1,
      involvedCivs: civIds, involvedEntities: [],
    })
  }
}
