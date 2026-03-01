// Creature Basket Weaver System (v3.488) - Basket weaving artisans
// Crafters producing woven containers from natural fibers

import { EntityManager } from '../ecs/Entity'

export interface BasketWeaver {
  id: number
  entityId: number
  fiberSelection: number
  weavePattern: number
  structuralIntegrity: number
  outputQuality: number
  tick: number
}

const CHECK_INTERVAL = 2570
const RECRUIT_CHANCE = 0.0017
const MAX_WEAVERS = 12

export class CreatureBasketWeaverSystem {
  private weavers: BasketWeaver[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.weavers.length < MAX_WEAVERS && Math.random() < RECRUIT_CHANCE) {
      this.weavers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        fiberSelection: 10 + Math.random() * 25,
        weavePattern: 15 + Math.random() * 20,
        structuralIntegrity: 5 + Math.random() * 20,
        outputQuality: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const w of this.weavers) {
      w.fiberSelection = Math.min(100, w.fiberSelection + 0.02)
      w.structuralIntegrity = Math.min(100, w.structuralIntegrity + 0.015)
      w.outputQuality = Math.min(100, w.outputQuality + 0.01)
    }

    for (let _i = this.weavers.length - 1; _i >= 0; _i--) { if (this.weavers[_i].fiberSelection <= 4) this.weavers.splice(_i, 1) }
  }

}
