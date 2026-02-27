// Creature Legacy System (v2.99) - Creatures leave lasting legacies after death
// Great deeds are remembered, influencing descendants and civilization culture

import { EntityManager } from '../ecs/Entity'

export type LegacyType = 'heroic' | 'scholarly' | 'artistic' | 'villainous' | 'diplomatic' | 'tragic'

export interface Legacy {
  id: number
  creatureId: number
  type: LegacyType
  fame: number         // 0-100
  description: string
  influenceRadius: number
  tick: number
}

const CHECK_INTERVAL = 1500
const LEGACY_CHANCE = 0.01
const MAX_LEGACIES = 60

const LEGACY_DESCRIPTIONS: Record<LegacyType, string[]> = {
  heroic: ['slew a great beast', 'defended the village', 'rescued the lost'],
  scholarly: ['discovered new knowledge', 'wrote ancient texts', 'mapped the stars'],
  artistic: ['composed a masterwork', 'built a monument', 'painted the caves'],
  villainous: ['betrayed their kin', 'burned a village', 'cursed the land'],
  diplomatic: ['forged a lasting peace', 'united rival clans', 'ended a great war'],
  tragic: ['sacrificed for others', 'died in exile', 'lost everything to fate'],
}

const LEGACY_WEIGHTS: Record<LegacyType, number> = {
  heroic: 0.25,
  scholarly: 0.15,
  artistic: 0.15,
  villainous: 0.1,
  diplomatic: 0.2,
  tragic: 0.15,
}

const LEGACY_TYPES = Object.keys(LEGACY_WEIGHTS) as LegacyType[]

export class CreatureLegacySystem {
  private legacies: Legacy[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.generateLegacies(em, tick)
    this.pruneLegacies()
  }

  private generateLegacies(em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('creature')

    for (const eid of entities) {
      if (Math.random() > LEGACY_CHANCE) continue

      const type = this.pickType()
      const descs = LEGACY_DESCRIPTIONS[type]
      const description = descs[Math.floor(Math.random() * descs.length)]

      this.legacies.push({
        id: this.nextId++,
        creatureId: eid,
        type,
        fame: 20 + Math.random() * 80,
        description,
        influenceRadius: 5 + Math.floor(Math.random() * 15),
        tick,
      })
    }
  }

  private pickType(): LegacyType {
    const r = Math.random()
    let cum = 0
    for (const t of LEGACY_TYPES) {
      cum += LEGACY_WEIGHTS[t]
      if (r <= cum) return t
    }
    return 'heroic'
  }

  private pruneLegacies(): void {
    if (this.legacies.length > MAX_LEGACIES) {
      this.legacies.splice(0, this.legacies.length - MAX_LEGACIES)
    }
  }

  getLegacies(): Legacy[] { return this.legacies }
  getRecentLegacies(count: number): Legacy[] { return this.legacies.slice(-count) }
  getHeroicCount(): number {
    let n = 0
    for (const l of this.legacies) { if (l.type === 'heroic') n++ }
    return n
  }
}
