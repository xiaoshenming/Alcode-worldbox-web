// Creature Divination System (v3.02) - Creatures practice divination to predict events
// Shamans and elders read signs from nature, influencing tribe decisions

import { EntityManager } from '../ecs/Entity'

export type DivinationType = 'stars' | 'bones' | 'flames' | 'water' | 'dreams' | 'birds'

export interface Divination {
  id: number
  creatureId: number
  method: DivinationType
  prediction: string
  accuracy: number     // 0-100
  believed: boolean
  tick: number
}

const CHECK_INTERVAL = 1100
const DIVINE_CHANCE = 0.02
const MAX_DIVINATIONS = 70

const PREDICTIONS = [
  'great_harvest', 'coming_war', 'natural_disaster',
  'peaceful_era', 'plague_warning', 'divine_blessing',
  'famine_ahead', 'new_alliance', 'betrayal_near',
] as const

const METHOD_WEIGHTS: Record<DivinationType, number> = {
  stars: 0.2, bones: 0.2, flames: 0.15,
  water: 0.15, dreams: 0.15, birds: 0.15,
}

const METHODS = Object.keys(METHOD_WEIGHTS) as DivinationType[]

export class CreatureDivinationSystem {
  private divinations: Divination[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.performDivinations(em, tick)
    this.pruneOld()
  }

  private performDivinations(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature')

    for (const eid of entities) {
      if (Math.random() > DIVINE_CHANCE) continue

      const method = this.pickMethod()
      const prediction = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)]

      this.divinations.push({
        id: this.nextId++,
        creatureId: eid,
        method,
        prediction,
        accuracy: 10 + Math.random() * 70,
        believed: Math.random() < 0.6,
        tick,
      })
    }
  }

  private pickMethod(): DivinationType {
    const r = Math.random()
    let cum = 0
    for (const m of METHODS) {
      cum += METHOD_WEIGHTS[m]
      if (r <= cum) return m
    }
    return 'stars'
  }

  private pruneOld(): void {
    if (this.divinations.length > MAX_DIVINATIONS) {
      this.divinations.splice(0, this.divinations.length - MAX_DIVINATIONS)
    }
  }

  getDivinations(): Divination[] { return this.divinations }
  getRecent(count: number): Divination[] { return this.divinations.slice(-count) }
  getBelievedCount(): number {
    let n = 0
    for (const d of this.divinations) { if (d.believed) n++ }
    return n
  }
}
