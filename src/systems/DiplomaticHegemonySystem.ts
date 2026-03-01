// Diplomatic Hegemony System (v3.511) - Hegemonic influence
// Power dynamics where dominant civilizations exert influence over others

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HegemonyForm = 'military_dominance' | 'economic_control' | 'cultural_influence' | 'political_pressure'

export interface HegemonyRelation {
  id: number
  hegemonCivId: number
  subordinateCivId: number
  form: HegemonyForm
  influenceLevel: number
  complianceRate: number
  resistanceIndex: number
  stabilityFactor: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const PROCEED_CHANCE = 0.0022
const MAX_RELATIONS = 16

const FORMS: HegemonyForm[] = ['military_dominance', 'economic_control', 'cultural_influence', 'political_pressure']

export class DiplomaticHegemonySystem {
  private relations: HegemonyRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const hegemon = 1 + Math.floor(Math.random() * 8)
      const subordinate = 1 + Math.floor(Math.random() * 8)
      if (hegemon === subordinate) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        hegemonCivId: hegemon,
        subordinateCivId: subordinate,
        form,
        influenceLevel: 30 + Math.random() * 40,
        complianceRate: 20 + Math.random() * 35,
        resistanceIndex: 10 + Math.random() * 30,
        stabilityFactor: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.influenceLevel = Math.max(10, Math.min(90, r.influenceLevel + (Math.random() - 0.48) * 0.13))
      r.complianceRate = Math.max(10, Math.min(85, r.complianceRate + (Math.random() - 0.5) * 0.11))
      r.resistanceIndex = Math.max(5, Math.min(80, r.resistanceIndex + (Math.random() - 0.42) * 0.12))
      r.stabilityFactor = Math.max(5, Math.min(70, r.stabilityFactor + (Math.random() - 0.46) * 0.10))
    }

    const cutoff = tick - 88000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

}
