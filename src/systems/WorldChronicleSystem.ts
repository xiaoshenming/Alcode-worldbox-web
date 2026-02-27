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

// Hero title banks (sorted descending by threshold)
const KILL_TITLES = [
  { min: 200, titles: ['Godslayer', 'The Undying Blade', 'Bane of Nations'] },
  { min: 100, titles: ['Hundred-Slayer', 'The Reaper', 'Dread Champion'] },
  { min: 50, titles: ['Warbringer', 'Ironhand', 'The Fierce'] },
  { min: 10, titles: ['Brave Fighter', 'Shieldbearer'] },
]
const BUILD_TITLES = [
  { min: 20, titles: ['The Great Builder', 'Architect of Ages'] },
  { min: 5, titles: ['Mason', 'Founder', 'Stonelayer'] },
]
const EXPLORE_TITLES = [
  { min: 50, titles: ['World-Walker', 'The Far-Seer'] },
  { min: 20, titles: ['Wanderer', 'Pathfinder', 'Trailblazer'] },
]

const DISASTER_ADJ: Record<string, string[]> = {
  earthquake: ['devastating', 'catastrophic'],
  fire: ['raging', 'infernal'],
  flood: ['great', 'torrential'],
  meteor: ['cataclysmic', 'apocalyptic'],
  tornado: ['furious', 'monstrous'],
  lightning: ['wrathful', 'thunderous'],
  plague: ['deadly', 'merciless'],
  volcano: ['erupting', 'fiery'],
}

const MAX_CHRONICLES = 500
const SUMMARY_INTERVAL = 3600

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function tickToYear(tick: number): number {
  return Math.floor(tick / 3600)
}

function matchTier(value: number, tiers: { min: number; titles: string[] }[]): string | null {
  for (const t of tiers) {
    if (value >= t.min) return pick(t.titles)
  }
  return null
}

export class WorldChronicleSystem {
  private chronicles: Chronicle[] = []
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
      const strongest = worldState.civilizations.reduce((a, b) => a.population > b.population ? a : b)
      if (strongest.cities >= 3) {
        this.recordCivMilestone(tick, strongest.id, strongest.name,
          `controls ${strongest.cities} cities with ${strongest.population} citizens`)
      }
    }
  }

  recordWar(tick: number, civA: number, civB: number, result: string, civAName?: string, civBName?: string): void {
    const warKey = [Math.min(civA, civB), Math.max(civA, civB)].join('-')
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

  recordHeroDeed(tick: number, heroName: string, deed: string, entityId: number, civId?: number): void {
    const year = tickToYear(tick)
    const importance: 1 | 2 | 3 = deed.includes('legendary') || deed.includes('100') ? 3
      : deed.includes('hero') || deed.includes('slain') ? 2 : 1
    const narrative = `${heroName} ${deed} in Year ${year}, earning renown across the land.`
    this.addChronicle({
      tick, year, category: 'hero', title: `${heroName}'s deed`, narrative, importance,
      involvedCivs: civId != null ? [civId] : [], involvedEntities: [entityId],
    })
    EventLog.log('hero', `[Chronicle] ${narrative}`, tick)
  }

  recordDisaster(tick: number, type: string, location: string, casualties: number): void {
    const year = tickToYear(tick)
    const adj = pick(DISASTER_ADJ[type] ?? ['terrible', 'fearsome'])
    const importance: 1 | 2 | 3 = casualties >= 50 ? 3 : casualties >= 10 ? 2 : 1
    const casualtyText = casualties > 0
      ? `${casualties} soul${casualties > 1 ? 's' : ''} perished`
      : 'miraculously, none perished'
    const narrative = `A ${adj} ${type} struck ${location} in Year ${year}. ${casualtyText}.`
    this.addChronicle({
      tick, year, category: 'disaster', title: `The ${adj} ${type} of Year ${year}`,
      narrative, importance, involvedCivs: [], involvedEntities: [],
    })
    EventLog.log('disaster', `[Chronicle] ${narrative}`, tick)
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

  generateHeroTitle(kills: number, buildings: number, explored: number): string {
    const scores = [
      { stat: 'kill' as const, value: kills },
      { stat: 'build' as const, value: buildings },
      { stat: 'explore' as const, value: explored },
    ].sort((a, b) => b.value - a.value)
    const best = scores[0]
    const tiers = best.stat === 'kill' ? KILL_TITLES : best.stat === 'build' ? BUILD_TITLES : EXPLORE_TITLES
    const val = best.stat === 'kill' ? kills : best.stat === 'build' ? buildings : explored
    return matchTier(val, tiers) ?? 'The Unremarkable'
  }

  getChronicles(filter?: { category?: string; minImportance?: number }): Chronicle[] {
    let result = this.chronicles
    if (filter?.category) result = result.filter(c => c.category === filter.category)
    if (filter?.minImportance) result = result.filter(c => c.importance >= filter.minImportance!)
    return result
  }

  getWorldSummary(tick: number): string {
    const year = tickToYear(tick)
    let wars = 0, heroes = 0, disasters = 0, legendary = 0
    for (let i = 0; i < this.chronicles.length; i++) {
      const c = this.chronicles[i]
      if (c.category === 'war') wars++
      else if (c.category === 'hero') heroes++
      else if (c.category === 'disaster') disasters++
      if (c.importance === 3) legendary++
    }
    return [
      `=== World Chronicle - Year ${year} ===`,
      `Total records: ${this.chronicles.length}`,
      `Wars: ${wars} | Heroes: ${heroes} | Disasters: ${disasters} | Legendary: ${legendary}`,
    ].join('\n')
  }

  getRecentChronicles(count: number = 10): Chronicle[] {
    return this.chronicles.slice(-count)
  }

  getChroniclesByEntity(entityId: number): Chronicle[] {
    return this.chronicles.filter(c => c.involvedEntities.includes(entityId))
  }

  getChroniclesByCiv(civId: number): Chronicle[] {
    return this.chronicles.filter(c => c.involvedCivs.includes(civId))
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
      const s = state.civilizations.reduce((a, b) => a.population > b.population ? a : b)
      parts.push(`Dominant: ${s.name} (pop ${s.population}, ${s.cities} cities)`)
    }
    this.addChronicle({
      tick, year, category: 'civilization', title: `Year ${year} summary`,
      narrative: parts.join('. ') + '.', importance: 1,
      involvedCivs: state.civilizations.map(c => c.id), involvedEntities: [],
    })
  }
}
