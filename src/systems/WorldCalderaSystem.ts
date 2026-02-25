// World Caldera System (v3.468) - Caldera formations
// Large volcanic depressions formed by collapse after massive eruptions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Caldera {
  id: number
  x: number
  y: number
  diameter: number
  lakeDepth: number
  resurgentDome: number
  geothermalActivity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2750
const FORM_CHANCE = 0.0008
const MAX_CALDERAS = 6

export class WorldCalderaSystem {
  private calderas: Caldera[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.calderas.length < MAX_CALDERAS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.calderas.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        diameter: 10 + Math.random() * 20,
        lakeDepth: 0,
        resurgentDome: Math.random() * 30,
        geothermalActivity: 20 + Math.random() * 40,
        age: 0,
        tick,
      })
    }

    for (const c of this.calderas) {
      c.age += 0.005
      c.lakeDepth = Math.min(80, c.lakeDepth + 0.01)
      c.geothermalActivity = Math.max(5, c.geothermalActivity - 0.005)
      c.resurgentDome = Math.min(100, c.resurgentDome + 0.003)
    }

    this.calderas = this.calderas.filter(c => c.age < 100)
  }

  getCalderas(): Caldera[] { return this.calderas }
}
