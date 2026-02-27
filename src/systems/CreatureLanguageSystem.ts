// Creature Language System (v2.28) - Creatures develop languages that evolve over time
// Languages affect diplomacy and trade efficiency between civilizations
// Shared language roots improve relations, divergent languages create barriers

export interface Language {
  id: number
  name: string
  civId: number
  rootFamily: number   // language family id
  complexity: number   // 1-10
  vocabulary: number   // word count approximation
  age: number
  parentId: number | null
}

export interface LanguageSimilarity {
  civA: number
  civB: number
  similarity: number   // 0-100
}

const EVOLVE_INTERVAL = 1200
const DRIFT_INTERVAL = 2000
const MAX_LANGUAGES = 30
const COMPLEXITY_GAIN = 0.2
const MAX_COMPLEXITY = 10

const LANGUAGE_ROOTS = [
  'Proto-Elder', 'Proto-Dawn', 'Proto-Stone', 'Proto-Wind',
  'Proto-Fire', 'Proto-Sea', 'Proto-Earth', 'Proto-Sky',
]

const LANGUAGE_SUFFIXES = [
  'ish', 'an', 'ic', 'ese', 'ine', 'al', 'oid', 'ean',
]

let nextLangId = 1
let nextFamilyId = 1

export class CreatureLanguageSystem {
  private languages: Map<number, Language> = new Map()  // civId -> language
  private similarities: LanguageSimilarity[] = []
  private lastEvolve = 0
  private lastDrift = 0
  // Reusable Set to avoid allocation in evolveLanguages (called every 1200 ticks)
  private _civIdSet: Set<number> = new Set()
  private _langBuf: Language[] = []

  update(dt: number, civIds: Iterable<number>, tick: number): void {
    if (tick - this.lastEvolve >= EVOLVE_INTERVAL) {
      this.lastEvolve = tick
      this.evolveLanguages(civIds, tick)
    }
    if (tick - this.lastDrift >= DRIFT_INTERVAL) {
      this.lastDrift = tick
      this.driftLanguages()
      this.computeSimilarities()
    }
  }

  private evolveLanguages(civIds: Iterable<number>, tick: number): void {
    const civIdSet = this._civIdSet
    civIdSet.clear()
    for (const id of civIds) civIdSet.add(id)
    for (const civId of civIdSet) {
      if (this.languages.has(civId)) {
        const lang = this.languages.get(civId)
        if (!lang) continue
        lang.age++
        lang.vocabulary += Math.floor(Math.random() * 20) + 5
        if (lang.complexity < MAX_COMPLEXITY) {
          lang.complexity = Math.min(MAX_COMPLEXITY, lang.complexity + COMPLEXITY_GAIN)
        }
        continue
      }
      if (this.languages.size >= MAX_LANGUAGES) continue
      const familyId = nextFamilyId++
      const root = LANGUAGE_ROOTS[Math.floor(Math.random() * LANGUAGE_ROOTS.length)]
      const suffix = LANGUAGE_SUFFIXES[Math.floor(Math.random() * LANGUAGE_SUFFIXES.length)]
      this.languages.set(civId, {
        id: nextLangId++,
        name: root.replace('Proto-', '') + suffix,
        civId,
        rootFamily: familyId,
        complexity: 1,
        vocabulary: 50 + Math.floor(Math.random() * 100),
        age: 0,
        parentId: null,
      })
    }
    // Remove languages for dead civs
    for (const [civId] of this.languages) {
      if (!civIdSet.has(civId)) {
        this.languages.delete(civId)
      }
    }
  }

  private driftLanguages(): void {
    // Languages in contact may converge, isolated ones diverge
    for (const [, lang] of this.languages) {
      if (Math.random() < 0.1) {
        lang.vocabulary += Math.floor(Math.random() * 10) - 3
        if (lang.vocabulary < 20) lang.vocabulary = 20
      }
    }
  }

  private computeSimilarities(): void {
    this.similarities = []
    const langs = this._langBuf
    langs.length = 0
    for (const v of this.languages.values()) langs.push(v)
    for (let i = 0; i < langs.length; i++) {
      for (let j = i + 1; j < langs.length; j++) {
        const a = langs[i], b = langs[j]
        let sim = 0
        if (a.rootFamily === b.rootFamily) sim += 50
        const complexDiff = Math.abs(a.complexity - b.complexity)
        sim += Math.max(0, 30 - complexDiff * 5)
        const vocabRatio = Math.min(a.vocabulary, b.vocabulary) / Math.max(a.vocabulary, b.vocabulary)
        sim += Math.floor(vocabRatio * 20)
        this.similarities.push({ civA: a.civId, civB: b.civId, similarity: Math.min(100, sim) })
      }
    }
  }

  getLanguage(civId: number): Language | undefined {
    return this.languages.get(civId)
  }

  getSimilarity(civA: number, civB: number): number {
    const s = this.similarities.find(
      s => (s.civA === civA && s.civB === civB) || (s.civA === civB && s.civB === civA)
    )
    return s?.similarity ?? 0
  }

  getLanguages(): Map<number, Language> {
    return this.languages
  }

  getLanguageCount(): number {
    return this.languages.size
  }
}
