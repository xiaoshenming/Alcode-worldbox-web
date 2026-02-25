// Creature Constellation System (v3.103) - Creatures study star patterns
// Stargazers identify constellations that grant cultural and navigation bonuses

import { EntityManager, EntityId, CreatureComponent } from '../ecs/Entity'

export type ConstellationType = 'warrior' | 'harvest' | 'voyage' | 'wisdom' | 'fortune'

export interface Constellation {
  id: number
  name: string
  type: ConstellationType
  discoveredBy: EntityId
  visibility: number
  bonusStrength: number
  season: number
  tick: number
}

const CHECK_INTERVAL = 3500
const DISCOVER_CHANCE = 0.004
const MAX_CONSTELLATIONS = 20

const TYPES: ConstellationType[] = ['warrior', 'harvest', 'voyage', 'wisdom', 'fortune']
const NAMES = [
  'The Great Bear', 'The Hunter', 'The Serpent', 'The Crown',
  'The Phoenix', 'The Anchor', 'The Scales', 'The Torch',
  'The Stag', 'The Chalice', 'The Hammer', 'The Owl',
]

export class CreatureConstellationSystem {
  private constellations: Constellation[] = []
  private nextId = 1
  private lastCheck = 0
  private usedNames: Set<string> = new Set()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Discover new constellations
    if (this.constellations.length < MAX_CONSTELLATIONS && Math.random() < DISCOVER_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const available = NAMES.filter(n => !this.usedNames.has(n))
        if (available.length > 0) {
          const name = available[Math.floor(Math.random() * available.length)]
          this.usedNames.add(name)
          this.constellations.push({
            id: this.nextId++,
            name,
            type: TYPES[Math.floor(Math.random() * TYPES.length)],
            discoveredBy: eid,
            visibility: 0.5 + Math.random() * 0.5,
            bonusStrength: 5 + Math.floor(Math.random() * 20),
            season: Math.floor(Math.random() * 4),
            tick,
          })
        }
      }
    }

    // Visibility fluctuates with time (simulating seasons)
    for (const c of this.constellations) {
      const phase = Math.sin((tick - c.tick) * 0.0001 + c.season)
      c.visibility = Math.max(0.1, Math.min(1, 0.5 + phase * 0.4))
    }
  }

  getConstellations(): readonly Constellation[] { return this.constellations }
}
