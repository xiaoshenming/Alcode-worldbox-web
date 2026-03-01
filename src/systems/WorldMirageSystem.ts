// World Mirage System (v3.126) - Desert mirages that confuse travelers
// Mirages appear in hot sandy areas and can mislead creatures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MirageType = 'oasis' | 'city' | 'lake' | 'mountain'

export interface Mirage {
  id: number
  x: number
  y: number
  mirageType: MirageType
  intensity: number
  duration: number
  creaturesDeceived: number
  tick: number
}

const CHECK_INTERVAL = 3600
const SPAWN_CHANCE = 0.003
const MAX_MIRAGES = 8

const TYPES: MirageType[] = ['oasis', 'city', 'lake', 'mountain']
const TYPE_INTENSITY: Record<MirageType, number> = {
  oasis: 70, city: 50, lake: 80, mountain: 40,
}

export class WorldMirageSystem {
  private mirages: Mirage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.mirages.length < MAX_MIRAGES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === 2) {
        const mt = TYPES[Math.floor(Math.random() * TYPES.length)]
        this.mirages.push({
          id: this.nextId++,
          x, y,
          mirageType: mt,
          intensity: TYPE_INTENSITY[mt],
          duration: 20000 + Math.floor(Math.random() * 40000),
          creaturesDeceived: 0,
          tick,
        })
      }
    }

    for (const m of this.mirages) {
      const age = tick - m.tick
      m.intensity = Math.max(0, TYPE_INTENSITY[m.mirageType] * (1 - age / m.duration))
      if (m.intensity > 20 && Math.random() < 0.01) {
        m.creaturesDeceived++
      }
    }

    for (let i = this.mirages.length - 1; i >= 0; i--) {
      if (this.mirages[i].intensity <= 0) this.mirages.splice(i, 1)
    }
  }

}
