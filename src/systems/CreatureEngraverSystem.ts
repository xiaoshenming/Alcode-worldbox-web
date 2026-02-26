// Creature Engraver System (v3.572) - Metal and stone engraving artisans
// Craftspeople who carve intricate designs into metal, stone, and wood

import { EntityManager } from '../ecs/Entity'

export interface Engraver {
  id: number
  entityId: number
  engravingSkill: number
  chiselControl: number
  designComplexity: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2680
const RECRUIT_CHANCE = 0.0014
const MAX_ENGRAVERS = 10

export class CreatureEngraverSystem {
  private engravers: Engraver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.engravers.length < MAX_ENGRAVERS && Math.random() < RECRUIT_CHANCE) {
      this.engravers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        engravingSkill: 10 + Math.random() * 25,
        chiselControl: 15 + Math.random() * 20,
        designComplexity: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const e of this.engravers) {
      e.engravingSkill = Math.min(100, e.engravingSkill + 0.02)
      e.chiselControl = Math.min(100, e.chiselControl + 0.015)
      e.outputQuality = Math.min(100, e.outputQuality + 0.01)
    }

    this.engravers = this.engravers.filter(e => e.engravingSkill > 4)
  }

  getEngravers(): Engraver[] { return this.engravers }
}
