// Creature Tinplater System (v3.635) - Tin plating artisans
// Craftspeople who coat iron and steel with protective tin layers

import { EntityManager } from '../ecs/Entity'

export interface Tinplater {
  id: number
  entityId: number
  platingSkill: number
  coatingUniformity: number
  bathControl: number
  corrosionResistance: number
  tick: number
}

const CHECK_INTERVAL = 2850
const RECRUIT_CHANCE = 0.0014
const MAX_TINPLATERS = 10

export class CreatureTinplaterSystem {
  private tinplaters: Tinplater[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tinplaters.length < MAX_TINPLATERS && Math.random() < RECRUIT_CHANCE) {
      this.tinplaters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        platingSkill: 10 + Math.random() * 25,
        coatingUniformity: 15 + Math.random() * 20,
        bathControl: 5 + Math.random() * 20,
        corrosionResistance: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.tinplaters) {
      t.platingSkill = Math.min(100, t.platingSkill + 0.02)
      t.coatingUniformity = Math.min(100, t.coatingUniformity + 0.015)
      t.corrosionResistance = Math.min(100, t.corrosionResistance + 0.01)
    }

    for (let _i = this.tinplaters.length - 1; _i >= 0; _i--) { if (this.tinplaters[_i].platingSkill <= 4) this.tinplaters.splice(_i, 1) }
  }

  getTinplaters(): Tinplater[] { return this.tinplaters }
}
