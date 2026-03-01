// Creature Soap Maker System (v3.146) - Creatures collect fat and ash to craft soap
// Skill improves with each batch, affecting soap quality

import { EntityManager } from '../ecs/Entity'

export type SoapRecipe = 'tallow' | 'olive' | 'lye' | 'herbal'

export interface SoapMaker {
  id: number
  entityId: number
  skill: number
  soapsMade: number
  currentBatch: number
  quality: number
  recipe: SoapRecipe
  tick: number
}

const CHECK_INTERVAL = 3200
const ASSIGN_CHANCE = 0.003
const MAX_SOAP_MAKERS = 12

const RECIPES: SoapRecipe[] = ['tallow', 'olive', 'lye', 'herbal']
const RECIPE_DIFFICULTY: Record<SoapRecipe, number> = {
  tallow: 0.3, olive: 0.4, lye: 0.5, herbal: 0.6,
}

export class CreatureSoapMakerSystem {
  private makers: SoapMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Assign new soap makers
    if (this.makers.length < MAX_SOAP_MAKERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.makers.some(m => m.entityId === eid)
        if (!already) {
          const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)]
          this.makers.push({
            id: this.nextId++,
            entityId: eid,
            skill: 5 + Math.floor(Math.random() * 15),
            soapsMade: 0,
            currentBatch: 0,
            quality: 10 + Math.floor(Math.random() * 10),
            recipe,
            tick,
          })
        }
      }
    }

    // Process soap making
    for (const m of this.makers) {
      // Gather materials for current batch
      if (m.currentBatch < 3 && Math.random() < 0.02) {
        m.currentBatch++
      }
      // Complete a batch when enough materials gathered
      if (m.currentBatch >= 3) {
        const difficulty = RECIPE_DIFFICULTY[m.recipe]
        const success = Math.random() < (m.skill / 100) + (1 - difficulty) * 0.3
        if (success) {
          m.soapsMade++
          m.skill = Math.min(100, m.skill + 0.4)
          m.quality = Math.min(100, m.quality + 0.25)
        } else {
          m.quality = Math.max(1, m.quality - 0.5)
        }
        m.currentBatch = 0
      }
    }

    // Remove makers whose creatures no longer exist
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.makers[i].entityId, 'creature')) this.makers.splice(i, 1)
    }
  }

}
