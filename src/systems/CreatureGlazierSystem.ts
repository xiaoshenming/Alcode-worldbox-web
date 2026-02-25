// Creature Glazier System (v3.178) - Creatures collect sand and craft glass products
// Glaziers operate furnaces to produce blown, cast, stained, or etched glassware

import { EntityManager } from '../ecs/Entity'

export type GlassTechnique = 'blown' | 'cast' | 'stained' | 'etched'

export interface Glazier {
  id: number
  entityId: number
  skill: number
  glassProduced: number
  windowsMade: number
  technique: GlassTechnique
  furnaceTemp: number
  tick: number
}

const CHECK_INTERVAL = 3100
const SPAWN_CHANCE = 0.003
const MAX_GLAZIERS = 10

const TECHNIQUES: GlassTechnique[] = ['blown', 'cast', 'stained', 'etched']
const TECHNIQUE_DIFFICULTY: Record<GlassTechnique, number> = {
  blown: 0.4, cast: 0.3, stained: 0.7, etched: 0.9,
}

export class CreatureGlazierSystem {
  private glaziers: Glazier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new glaziers
    if (this.glaziers.length < MAX_GLAZIERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.glaziers.some(g => g.entityId === eid)) {
          const tech = TECHNIQUES[Math.floor(Math.random() * TECHNIQUES.length)]
          this.glaziers.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            glassProduced: 0, windowsMade: 0,
            technique: tech,
            furnaceTemp: 800 + Math.random() * 200,
            tick,
          })
        }
      }
    }

    for (const g of this.glaziers) {
      // Maintain furnace temperature
      g.furnaceTemp += (Math.random() - 0.48) * 20
      g.furnaceTemp = Math.max(600, Math.min(1400, g.furnaceTemp))

      // Produce glass when furnace is hot enough
      const difficulty = TECHNIQUE_DIFFICULTY[g.technique]
      const craftChance = (g.skill / 100) * (g.furnaceTemp / 1200) * 0.05
      if (g.furnaceTemp > 900 && Math.random() < craftChance) {
        g.glassProduced++
        g.skill = Math.min(100, g.skill + 0.12 * difficulty)
      }

      // Make windows from produced glass
      if (g.glassProduced >= 2 && Math.random() < 0.025) {
        g.windowsMade++
        g.glassProduced -= 2
      }

      // Learn advanced techniques with high skill
      if (g.skill > 55 && Math.random() < 0.004) {
        const idx = TECHNIQUES.indexOf(g.technique)
        if (idx < TECHNIQUES.length - 1) g.technique = TECHNIQUES[idx + 1]
      }

      // Furnace efficiency improves with experience
      if (g.skill > 40 && Math.random() < 0.006) {
        g.furnaceTemp = Math.min(1400, g.furnaceTemp + 5)
      }
    }

    // Remove glaziers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.glaziers.length - 1; i >= 0; i--) {
      if (!alive.has(this.glaziers[i].entityId)) this.glaziers.splice(i, 1)
    }
  }

  getGlaziers(): readonly Glazier[] { return this.glaziers }
}
