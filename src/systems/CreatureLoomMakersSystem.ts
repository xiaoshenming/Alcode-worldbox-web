// Creature Loom Makers System (v3.455) - Loom-weaving artisans
// Skilled weavers operating looms to produce cloth and tapestries

import { EntityManager } from '../ecs/Entity'

export interface LoomMaker {
  id: number
  entityId: number
  loomMastery: number
  threadCount: number
  patternMemory: number
  weavingSpeed: number
  tick: number
}

const CHECK_INTERVAL = 2550
const RECRUIT_CHANCE = 0.0016
const MAX_MAKERS = 12

export class CreatureLoomMakersSystem {
  private makers: LoomMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        loomMastery: 10 + Math.random() * 25,
        threadCount: 20 + Math.random() * 30,
        patternMemory: 5 + Math.random() * 20,
        weavingSpeed: 15 + Math.random() * 20,
        tick,
      })
    }

    for (const m of this.makers) {
      m.loomMastery = Math.min(100, m.loomMastery + 0.02)
      m.patternMemory = Math.min(100, m.patternMemory + 0.015)
      m.weavingSpeed = Math.min(100, m.weavingSpeed + 0.01)
    }

    this.makers = this.makers.filter(m => m.loomMastery > 4)
  }

  getMakers(): LoomMaker[] { return this.makers }
}
