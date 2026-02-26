// Creature Invention System (v2.59) - Creatures invent tools and techniques
// Inventions spread between creatures and boost civilization progress
// Rare breakthrough inventions can shift the balance of power

import { EntityManager, EntityId, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type InventionCategory = 'tool' | 'weapon' | 'agriculture' | 'medicine' | 'construction' | 'navigation'

export interface Invention {
  id: number
  inventorId: EntityId
  category: InventionCategory
  name: string
  power: number         // 1-100 effectiveness
  spreadRate: number    // 0.0-1.0 how fast it spreads
  adopters: number      // count of creatures using it
  createdAt: number
  civId: number | null  // originating civilization
}

const CHECK_INTERVAL = 1100
const SPREAD_INTERVAL = 800
const MAX_INVENTIONS = 50
const INVENT_CHANCE = 0.025

const CATEGORIES: InventionCategory[] = ['tool', 'weapon', 'agriculture', 'medicine', 'construction', 'navigation']

const INVENTION_NAMES: Record<InventionCategory, string[]> = {
  tool: ['lever', 'pulley', 'wheel', 'rope', 'basket', 'chisel'],
  weapon: ['sling', 'spear-thrower', 'shield', 'bow', 'catapult', 'crossbow'],
  agriculture: ['irrigation', 'crop rotation', 'fertilizer', 'seed selection', 'terracing', 'granary'],
  medicine: ['herbal remedy', 'splint', 'antiseptic', 'surgery', 'vaccination', 'anesthesia'],
  construction: ['arch', 'mortar', 'scaffolding', 'aqueduct', 'dome', 'buttress'],
  navigation: ['compass', 'star chart', 'sextant', 'map-making', 'lighthouse', 'harbor'],
}

export class CreatureInventionSystem {
  private inventions: Invention[] = []
  private nextId = 1
  private lastCheck = 0
  private lastSpread = 0
  private totalInvented = 0
  private breakthroughs = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.generateInventions(em, civManager, tick)
    }
    if (tick - this.lastSpread >= SPREAD_INTERVAL) {
      this.lastSpread = tick
      this.spreadInventions(em)
    }
  }

  private generateInventions(em: EntityManager, civManager: CivManager, tick: number): void {
    if (this.inventions.length >= MAX_INVENTIONS) return
    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const id of creatures) {
      if (Math.random() > INVENT_CHANCE) continue
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!creature) continue

      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
      const names = INVENTION_NAMES[category]
      const name = names[Math.floor(Math.random() * names.length)]

      // Avoid duplicate inventions
      if (this.inventions.some(inv => inv.name === name && inv.category === category)) continue

      const power = 20 + Math.floor(Math.random() * 80)
      const isBreakthrough = power > 80

      if (isBreakthrough) this.breakthroughs++

      const civs = Array.from(civManager.civilizations.values())
      let civId: number | null = null
      if (civs.length > 0) {
        civId = civs[Math.floor(Math.random() * civs.length)].id
      }

      this.inventions.push({
        id: this.nextId++,
        inventorId: id,
        category,
        name,
        power,
        spreadRate: 0.05 + Math.random() * 0.15,
        adopters: 1,
        createdAt: tick,
        civId,
      })
      this.totalInvented++
      if (this.inventions.length >= MAX_INVENTIONS) break
    }
  }

  private spreadInventions(em: EntityManager): void {
    const creatureCount = em.getEntitiesWithComponents('creature').length
    for (const inv of this.inventions) {
      if (inv.adopters >= creatureCount) continue
      const newAdopters = Math.floor(inv.adopters * inv.spreadRate) + 1
      inv.adopters = Math.min(creatureCount, inv.adopters + newAdopters)
    }
  }

  getInventions(): Invention[] { return this.inventions }
  getInventionsByCategory(cat: InventionCategory): Invention[] {
    return this.inventions.filter(i => i.category === cat)
  }
  getTotalInvented(): number { return this.totalInvented }
  getBreakthroughs(): number { return this.breakthroughs }
}
