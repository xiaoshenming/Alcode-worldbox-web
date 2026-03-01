// Creature Lapper System (v3.683) - Metal lapping artisans
// Craftspeople who achieve ultra-fine surface finishes using lapping compounds

import { EntityManager } from '../ecs/Entity'

export interface Lapper {
  id: number
  entityId: number
  lappingSkill: number
  compoundSelection: number
  flatnessAccuracy: number
  mirrorFinish: number
  tick: number
}

const CHECK_INTERVAL = 2970
const RECRUIT_CHANCE = 0.0015
const MAX_LAPPERS = 10

export class CreatureLapperSystem {
  private lappers: Lapper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.lappers.length < MAX_LAPPERS && Math.random() < RECRUIT_CHANCE) {
      this.lappers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        lappingSkill: 10 + Math.random() * 25,
        compoundSelection: 15 + Math.random() * 20,
        flatnessAccuracy: 5 + Math.random() * 20,
        mirrorFinish: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const l of this.lappers) {
      l.lappingSkill = Math.min(100, l.lappingSkill + 0.02)
      l.compoundSelection = Math.min(100, l.compoundSelection + 0.015)
      l.mirrorFinish = Math.min(100, l.mirrorFinish + 0.01)
    }

    for (let _i = this.lappers.length - 1; _i >= 0; _i--) { if (this.lappers[_i].lappingSkill <= 4) this.lappers.splice(_i, 1) }
  }

}
