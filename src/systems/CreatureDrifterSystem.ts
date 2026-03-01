// Creature Drifter System (v3.704) - Metal drifting artisans
// Craftspeople who enlarge and shape holes using tapered drift pins

import { EntityManager } from '../ecs/Entity'

export interface Drifter {
  id: number
  entityId: number
  driftingSkill: number
  pinAlignment: number
  holeExpansion: number
  taperControl: number
  tick: number
}

const CHECK_INTERVAL = 3040
const RECRUIT_CHANCE = 0.0015
const MAX_DRIFTERS = 10

export class CreatureDrifterSystem {
  private drifters: Drifter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.drifters.length < MAX_DRIFTERS && Math.random() < RECRUIT_CHANCE) {
      this.drifters.push({
        id: this.nextId++,
        entityId: Math.floor(Math.random() * 500),
        driftingSkill: 10 + Math.random() * 25,
        pinAlignment: 15 + Math.random() * 20,
        holeExpansion: 5 + Math.random() * 20,
        taperControl: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const d of this.drifters) {
      d.driftingSkill = Math.min(100, d.driftingSkill + 0.02)
      d.pinAlignment = Math.min(100, d.pinAlignment + 0.015)
      d.taperControl = Math.min(100, d.taperControl + 0.01)
    }

    for (let _i = this.drifters.length - 1; _i >= 0; _i--) { if (this.drifters[_i].driftingSkill <= 4) this.drifters.splice(_i, 1) }
  }

}
