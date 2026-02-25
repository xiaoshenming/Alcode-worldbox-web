// Creature Quiver Maker System (v3.503) - Quiver crafting artisans
// Skilled crafters producing arrow containers from leather and wood

import { EntityManager } from '../ecs/Entity'

export interface QuiverMaker {
  id: number
  entityId: number
  leatherStitching: number
  shapeDesign: number
  waterproofing: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2580
const RECRUIT_CHANCE = 0.0016
const MAX_MAKERS = 11

export class CreatureQuiverMakerSystem {
  private makers: QuiverMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        leatherStitching: 10 + Math.random() * 25,
        shapeDesign: 15 + Math.random() * 20,
        waterproofing: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.leatherStitching = Math.min(100, m.leatherStitching + 0.02)
      m.waterproofing = Math.min(100, m.waterproofing + 0.015)
      m.outputQuality = Math.min(100, m.outputQuality + 0.01)
    }

    this.makers = this.makers.filter(m => m.leatherStitching > 4)
  }

  getMakers(): QuiverMaker[] { return this.makers }
}
