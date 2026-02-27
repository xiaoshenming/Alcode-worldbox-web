// Culture & Language System (v1.25)
// Unique cultures per civilization, language families, procedural name generation, cultural spread

import { EventLog } from './EventLog'

// --- Types & Interfaces ---

export type CultureTraitType = 'warrior' | 'merchant' | 'scholarly' | 'devout' | 'seafaring' | 'agrarian' | 'nomadic' | 'artistic'

export interface CultureTraitDef {
  type: CultureTraitType
  label: string
  bonuses: Record<string, number>  // e.g. { combat: 0.15, morale: 0.1 }
}

export interface LanguageFamily {
  id: number
  name: string
  phonemes: string[]
  namePatterns: string[]  // C=consonant, V=vowel
}

export interface Culture {
  civId: number
  name: string
  traits: CultureTraitType[]
  language: LanguageFamily
  artStyle: 'geometric' | 'naturalistic' | 'abstract' | 'symbolic'
  values: { militarism: number; commerce: number; piety: number; knowledge: number }
  traditions: string[]
  influence: number  // 0-100
}

// --- Trait definitions ---

const TRAIT_DEFS: Record<CultureTraitType, CultureTraitDef> = {
  warrior:   { type: 'warrior',   label: 'Warrior',   bonuses: { combat: 0.15, morale: 0.1 } },
  merchant:  { type: 'merchant',  label: 'Merchant',  bonuses: { trade: 0.2, gold: 0.15 } },
  scholarly: { type: 'scholarly', label: 'Scholarly',  bonuses: { research: 0.2, techSpeed: 0.1 } },
  devout:    { type: 'devout',    label: 'Devout',     bonuses: { faith: 0.2, happiness: 0.1 } },
  seafaring: { type: 'seafaring', label: 'Seafaring',  bonuses: { naval: 0.25, trade: 0.1 } },
  agrarian:  { type: 'agrarian',  label: 'Agrarian',   bonuses: { food: 0.2, growth: 0.1 } },
  nomadic:   { type: 'nomadic',   label: 'Nomadic',    bonuses: { speed: 0.2, exploration: 0.15 } },
  artistic:  { type: 'artistic',  label: 'Artistic',   bonuses: { influence: 0.25, happiness: 0.1 } },
}

const ALL_TRAITS: CultureTraitType[] = Object.keys(TRAIT_DEFS) as CultureTraitType[]
const ART_STYLES: Culture['artStyle'][] = ['geometric', 'naturalistic', 'abstract', 'symbolic']

const TRADITION_POOL = [
  'Harvest Festival', 'Ancestor Worship', 'Trial by Combat', 'Grand Market Day',
  'Stargazing Rites', 'Spring Planting', 'Fire Dance', 'Storytelling Night',
  'Warrior Initiation', 'Seafarer\'s Blessing', 'Scholar\'s Debate', 'Stone Carving',
  'Moon Feast', 'Sun Salutation', 'Winter Solstice', 'Rain Calling',
]

// --- Language families (4 base: Human, Elf, Dwarf, Orc) ---

const BASE_LANGUAGES: LanguageFamily[] = [
  {
    id: 0, name: 'Common',
    phonemes: ['a','e','i','o','u','r','l','n','s','t','d','m','k','b','th','w','f','g','p','v'],
    namePatterns: ['CVC', 'CVCCV', 'CVCVC', 'CVCCVC'],
  },
  {
    id: 1, name: 'Elvish',
    phonemes: ['a','e','i','o','ae','ei','al','el','il','th','l','r','n','s','d','v','f','w','y','sh'],
    namePatterns: ['VCVC', 'VCCVC', 'VCVCV', 'CVCCV'],
  },
  {
    id: 2, name: 'Dwarvish',
    phonemes: ['a','o','u','i','e','k','g','d','b','r','n','m','th','dr','gr','br','z','f','t','kh'],
    namePatterns: ['CVCCVC', 'CVCVC', 'CCVCVC', 'CVCC'],
  },
  {
    id: 3, name: 'Orcish',
    phonemes: ['a','o','u','ug','ag','g','k','r','z','th','gr','kr','b','d','m','n','sh','gh','rk','zg'],
    namePatterns: ['CVCC', 'CVCVC', 'CCVC', 'CVCCV'],
  },
]

// City name components per language
const CITY_PREFIXES: Record<number, string[]> = {
  0: ['North','South','East','West','High','Low','Old','New','Iron','Gold','Silver','Storm','Sun','Moon','Dark','Bright'],
  1: ['Ael','Thal','Lor','Sil','Ith','Cel','Gal','Elen','Fae','Nim','Aur','Quel'],
  2: ['Kaz','Dum','Bel','Grim','Thor','Bol','Dun','Mor','Khar','Barak','Gor','Zul'],
  3: ['Gash','Mok','Dra','Kro','Gor','Zul','Rak','Thok','Urg','Bur','Skar','Nag'],
}

const CITY_SUFFIXES: Record<number, string[]> = {
  0: ['haven','ford','holm','shire','keep','gate','wall','vale','mere','fell','burg','ton','dale','crest','watch'],
  1: ['ador','anor','iel','oth','wen','dor','las','rin','mir','thas','ael','ion'],
  2: ['hold','deep','forge','mine','hall','heim','gard','rak','dum','rim','delve','peak'],
  3: ['gul','mash','rok','gor','zag','dak','mar','tuk','nak','goth','rak','bur'],
}

const SPREAD_INTERVAL = 180
const CULTURE_NAME_SUFFIXES = ['an', 'ite', 'ese', 'ish', 'ic', 'ian', 'ean', 'oid']

// --- Helpers ---

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// --- Main class ---

export class CultureSystem {
  private cultures: Map<number, Culture> = new Map()
  private languages: LanguageFamily[] = [...BASE_LANGUAGES]
  // Cache vowels/consonants per language id to avoid filter() on each name generation
  private _phonemeCache: Map<number, { vowels: string[]; consonants: string[] }> = new Map()

  constructor() {}

  update(
    tick: number,
    civData: { id: number; neighbors: number[]; tradePartners: number[]; population: number }[]
  ): void {
    if (tick % SPREAD_INTERVAL !== 0) return

    // Cultural influence growth
    for (const cd of civData) {
      const culture = this.cultures.get(cd.id)
      if (!culture) continue
      let growth = 1 + cd.population * 0.02
      if (culture.traits.includes('artistic')) growth *= 1.4
      culture.influence = clamp(culture.influence + growth, 0, 100)
    }

    // Spread & assimilation between neighbors
    for (const cd of civData) {
      const mine = this.cultures.get(cd.id)
      if (!mine) continue

      for (const nId of cd.neighbors) {
        const other = this.cultures.get(nId)
        if (!other) continue
        this.spreadBetween(mine, other, false, tick)
      }

      // Trade partners spread faster
      for (const tId of cd.tradePartners) {
        if (cd.neighbors.includes(tId)) continue // already handled
        const other = this.cultures.get(tId)
        if (!other) continue
        this.spreadBetween(mine, other, true, tick)
      }
    }
  }

  createCulture(civId: number, raceName: string): Culture {
    const lang = this.pickLanguage(raceName)
    const traitCount = randInt(2, 3)
    const shuffled = [...ALL_TRAITS].sort(() => Math.random() - 0.5)
    const traits = shuffled.slice(0, traitCount)

    const baseName = this.generateNameFromLang(lang)
    const suffix = pick(CULTURE_NAME_SUFFIXES)
    const cultureName = baseName + suffix

    const traditions: string[] = []
    const tradCount = randInt(1, 3)
    const tradPool = [...TRADITION_POOL].sort(() => Math.random() - 0.5)
    for (let i = 0; i < tradCount; i++) traditions.push(tradPool[i])

    const culture: Culture = {
      civId,
      name: cultureName,
      traits,
      language: lang,
      artStyle: pick(ART_STYLES),
      values: {
        militarism: randInt(10, 80),
        commerce: randInt(10, 80),
        piety: randInt(10, 80),
        knowledge: randInt(10, 80),
      },
      traditions,
      influence: randInt(5, 20),
    }

    // Bias values toward traits
    if (traits.includes('warrior')) culture.values.militarism = clamp(culture.values.militarism + 20, 0, 100)
    if (traits.includes('merchant')) culture.values.commerce = clamp(culture.values.commerce + 20, 0, 100)
    if (traits.includes('devout')) culture.values.piety = clamp(culture.values.piety + 20, 0, 100)
    if (traits.includes('scholarly')) culture.values.knowledge = clamp(culture.values.knowledge + 20, 0, 100)

    this.cultures.set(civId, culture)
    EventLog.log('culture', `${cultureName} culture emerged (${traits.map(t => TRAIT_DEFS[t].label).join(', ')})`, 0)
    return culture
  }

  generateName(civId: number): string {
    const culture = this.cultures.get(civId)
    if (!culture) return 'Unknown'
    return this.generateNameFromLang(culture.language)
  }

  generateCityName(civId: number): string {
    const culture = this.cultures.get(civId)
    if (!culture) return 'Settlement'
    const langId = culture.language.id
    const prefixes = CITY_PREFIXES[langId] ?? CITY_PREFIXES[0]
    const suffixes = CITY_SUFFIXES[langId] ?? CITY_SUFFIXES[0]
    return pick(prefixes) + pick(suffixes)
  }

  getCulture(civId: number): Culture | undefined {
    return this.cultures.get(civId)
  }

  getCultureBonus(civId: number, type: string): number {
    const culture = this.cultures.get(civId)
    if (!culture) return 0
    let total = 0
    for (const t of culture.traits) {
      const def = TRAIT_DEFS[t]
      if (def.bonuses[type] !== undefined) total += def.bonuses[type]
    }
    return total
  }

  getLanguageCompatibility(civA: number, civB: number): number {
    const a = this.cultures.get(civA)
    const b = this.cultures.get(civB)
    if (!a || !b) return 0
    if (a.language.id === b.language.id) return 1.0

    // Partial compatibility: count shared phonemes
    const setA = new Set(a.language.phonemes)
    let shared = 0
    for (const p of b.language.phonemes) {
      if (setA.has(p)) shared++
    }
    const maxLen = Math.max(a.language.phonemes.length, b.language.phonemes.length)
    return maxLen > 0 ? (shared / maxLen) * 0.6 : 0
  }

  // --- Private methods ---

  private pickLanguage(raceName: string): LanguageFamily {
    const lower = raceName.toLowerCase()
    if (lower.includes('elf') || lower.includes('elv')) return this.languages[1]
    if (lower.includes('dwarf') || lower.includes('dwar')) return this.languages[2]
    if (lower.includes('orc')) return this.languages[3]
    return this.languages[0] // human / default
  }

  private generateNameFromLang(lang: LanguageFamily): string {
    const pattern = pick(lang.namePatterns)
    // Use cached vowels/consonants to avoid filter() on each call
    let cached = this._phonemeCache.get(lang.id)
    if (!cached) {
      cached = {
        vowels: lang.phonemes.filter(p => /^[aeiou]/.test(p)),
        consonants: lang.phonemes.filter(p => !/^[aeiou]/.test(p)),
      }
      this._phonemeCache.set(lang.id, cached)
    }
    const { vowels, consonants } = cached
    if (vowels.length === 0 || consonants.length === 0) return 'Unnamed'

    let name = ''
    for (const ch of pattern) {
      if (ch === 'V') name += pick(vowels)
      else if (ch === 'C') name += pick(consonants)
    }
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  private spreadBetween(a: Culture, b: Culture, viaTrade: boolean, tick: number): void {
    const diff = a.influence - b.influence
    if (Math.abs(diff) < 5) return

    const stronger = diff > 0 ? a : b
    const weaker = diff > 0 ? b : a
    const gap = Math.abs(diff)
    const rate = viaTrade ? 0.03 : 0.015

    // Influence shift
    const shift = gap * rate
    weaker.influence = clamp(weaker.influence + shift * 0.3, 0, 100)
    stronger.influence = clamp(stronger.influence - shift * 0.1, 0, 100)

    // Value drift: weaker drifts toward stronger
    const valueDrift = gap * 0.002
    for (const key of ['militarism', 'commerce', 'piety', 'knowledge'] as const) {
      const d = stronger.values[key] - weaker.values[key]
      weaker.values[key] = clamp(weaker.values[key] + d * valueDrift, 0, 100)
    }

    // Trait adoption: if gap > 40 and weaker has room, small chance to adopt a trait
    if (gap > 40 && weaker.traits.length < 5) {
      const missing = stronger.traits.filter(t => !weaker.traits.includes(t))
      if (missing.length > 0 && Math.random() < 0.04) {
        const adopted = pick(missing)
        weaker.traits.push(adopted)
        EventLog.log('culture', `${weaker.name} adopted ${TRAIT_DEFS[adopted].label} from ${stronger.name}`, tick)
      }
    }

    // Language spread: if gap > 60, small chance weaker adopts stronger's language
    if (gap > 60 && a.language.id !== b.language.id && Math.random() < 0.02) {
      const oldLang = weaker.language.name
      weaker.language = stronger.language
      EventLog.log('culture', `${weaker.name} adopted ${stronger.language.name} language (was ${oldLang})`, tick)
    }

    // Cultural fusion: long contact with similar influence can create new tradition
    if (Math.abs(diff) < 15 && Math.random() < 0.01) {
      const fusionTradition = `${a.name}-${b.name} Exchange Festival`
      if (!a.traditions.includes(fusionTradition) && a.traditions.length < 8) {
        a.traditions.push(fusionTradition)
      }
      if (!b.traditions.includes(fusionTradition) && b.traditions.length < 8) {
        b.traditions.push(fusionTradition)
      }
    }
  }
}
