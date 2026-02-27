// Creature Warping Makers System (v3.464) - Warping artisans
// Crafters preparing warp threads for looms and textile production

import { EntityManager } from '../ecs/Entity'

export interface WarpingMaker {
  id: number
  entityId: number
  tensionControl: number
  threadAlignment: number
  beamLoading: number
  efficiency: number
  tick: number
}

const CHECK_INTERVAL = 2500
const RECRUIT_CHANCE = 0.0017
const MAX_MAKERS = 12

export class CreatureWarpingMakersSystem {
  private makers: WarpingMaker[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.makers.length < MAX_MAKERS && Math.random() < RECRUIT_CHANCE) {
      this.makers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        tensionControl: 10 + Math.random() * 25,
        threadAlignment: 15 + Math.random() * 20,
        beamLoading: 10 + Math.random() * 20,
        efficiency: 15 + Math.random() * 25,
        tick,
      })
    }

    for (const m of this.makers) {
      m.tensionControl = Math.min(100, m.tensionControl + 0.02)
      m.threadAlignment = Math.min(100, m.threadAlignment + 0.015)
      m.efficiency = Math.min(100, m.efficiency + 0.01)
    }

    for (let _i = this.makers.length - 1; _i >= 0; _i--) { if (this.makers[_i].tensionControl <= 4) this.makers.splice(_i, 1) }
  }

  getMakers(): WarpingMaker[] { return this.makers }
}
