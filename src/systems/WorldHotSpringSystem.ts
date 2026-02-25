// World Hot Spring System (v3.120) - Natural hot springs for healing and rest
// Hot springs appear near mountains and provide health regeneration

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SpringTemperature = 'warm' | 'hot' | 'scalding' | 'volcanic'

export interface HotSpring {
  id: number
  x: number
  y: number
  temperature: SpringTemperature
  healingRate: number
  mineralContent: number
  visitors: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 3800
const SPAWN_CHANCE = 0.002
const MAX_SPRINGS = 10

const TEMPS: SpringTemperature[] = ['warm', 'hot', 'scalding', 'volcanic']
const TEMP_HEALING: Record<SpringTemperature, number> = {
  warm: 3, hot: 8, scalding: 5, volcanic: 2,
}
const TEMP_MINERAL: Record<SpringTemperature, number> = {
  warm: 10, hot: 20, scalding: 35, volcanic: 50,
}

export class WorldHotSpringSystem {
  private springs: HotSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn hot springs near mountains
    if (this.springs.length < MAX_SPRINGS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && (tile === 5 || tile === 4)) {
        const temp = TEMPS[Math.floor(Math.random() * TEMPS.length)]
        this.springs.push({
          id: this.nextId++,
          x, y,
          temperature: temp,
          healingRate: TEMP_HEALING[temp],
          mineralContent: TEMP_MINERAL[temp],
          visitors: 0,
          age: 0,
          tick,
        })
      }
    }

    for (const s of this.springs) {
      s.age = tick - s.tick
      if (Math.random() < 0.02) {
        s.visitors = Math.min(50, s.visitors + 1)
      }
      if (s.age > 80000) {
        s.mineralContent = Math.max(1, s.mineralContent - 0.02)
      }
    }

    const cutoff = tick - 300000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

  getSprings(): readonly HotSpring[] { return this.springs }
}
