// Creature Silk Weaver System (v3.479) - Silk weaving artisans
// Master weavers producing fine silk fabrics and textiles

import { EntityManager } from '../ecs/Entity'

export interface SilkWeaver {
  id: number
  entityId: number
  threadFineness: number
  loomMastery: number
  patternComplexity: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2580
const RECRUIT_CHANCE = 0.0016
const MAX_WEAVERS = 11

export class CreatureSilkWeaverSystem {
  private weavers: SilkWeaver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.weavers.length < MAX_WEAVERS && Math.random() < RECRUIT_CHANCE) {
      this.weavers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        threadFineness: 10 + Math.random() * 25,
        loomMastery: 15 + Math.random() * 20,
        patternComplexity: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.weavers) {
      w.threadFineness = Math.min(100, w.threadFineness + 0.02)
      w.patternComplexity = Math.min(100, w.patternComplexity + 0.015)
      w.outputQuality = Math.min(100, w.outputQuality + 0.01)
    }

    for (let _i = this.weavers.length - 1; _i >= 0; _i--) { if (this.weavers[_i].threadFineness <= 4) this.weavers.splice(_i, 1) }
  }

}
