// Creature Nibbler System (v3.737) - Metal nibbling artisans
// Craftspeople who cut sheet metal using nibbling tools and machines

import { EntityManager } from '../ecs/Entity'

export interface Nibbler {
  id: number
  entityId: number
  nibblingSkill: number
  cutPrecision: number
  sheetHandling: number
  toolMaintenance: number
  tick: number
}

const CHECK_INTERVAL = 3200
const RECRUIT_CHANCE = 0.0015
const MAX_NIBBLERS = 10

export class CreatureNibblerSystem {
  private nibblers: Nibbler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.nibblers.length < MAX_NIBBLERS && Math.random() < RECRUIT_CHANCE) {
      this.nibblers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        nibblingSkill: 10 + Math.random() * 25,
        cutPrecision: 15 + Math.random() * 20,
        sheetHandling: 5 + Math.random() * 20,
        toolMaintenance: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const n of this.nibblers) {
      n.nibblingSkill = Math.min(100, n.nibblingSkill + 0.02)
      n.cutPrecision = Math.min(100, n.cutPrecision + 0.015)
      n.toolMaintenance = Math.min(100, n.toolMaintenance + 0.01)
    }

    for (let _i = this.nibblers.length - 1; _i >= 0; _i--) { if (this.nibblers[_i].nibblingSkill <= 4) this.nibblers.splice(_i, 1) }
  }

}
