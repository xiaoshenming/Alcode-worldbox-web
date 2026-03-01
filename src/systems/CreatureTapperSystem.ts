// Creature Tapper System (v3.695) - Metal tapping artisans
// Craftspeople who cut internal threads in drilled holes

import { EntityManager } from '../ecs/Entity'

export interface Tapper {
  id: number
  entityId: number
  tappingSkill: number
  threadPitch: number
  depthControl: number
  alignmentAccuracy: number
  tick: number
}

const CHECK_INTERVAL = 3010
const RECRUIT_CHANCE = 0.0015
const MAX_TAPPERS = 10

export class CreatureTapperSystem {
  private tappers: Tapper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tappers.length < MAX_TAPPERS && Math.random() < RECRUIT_CHANCE) {
      this.tappers.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        tappingSkill: 10 + Math.random() * 25,
        threadPitch: 15 + Math.random() * 20,
        depthControl: 5 + Math.random() * 20,
        alignmentAccuracy: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const t of this.tappers) {
      t.tappingSkill = Math.min(100, t.tappingSkill + 0.02)
      t.threadPitch = Math.min(100, t.threadPitch + 0.015)
      t.alignmentAccuracy = Math.min(100, t.alignmentAccuracy + 0.01)
    }

    for (let _i = this.tappers.length - 1; _i >= 0; _i--) { if (this.tappers[_i].tappingSkill <= 4) this.tappers.splice(_i, 1) }
  }

}
