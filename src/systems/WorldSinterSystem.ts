// World Sinter System (v3.495) - Sinter mineral formations
// Mineral deposits formed by precipitation from thermal waters

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SinterFormation {
  id: number
  x: number
  y: number
  mineralDensity: number
  porosity: number
  thermalGradient: number
  depositionRate: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2750
const FORM_CHANCE = 0.0008
const MAX_FORMATIONS = 7

export class WorldSinterSystem {
  private formations: SinterFormation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.formations.length < MAX_FORMATIONS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.formations.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        mineralDensity: 35 + Math.random() * 40,
        porosity: 20 + Math.random() * 30,
        thermalGradient: 25 + Math.random() * 35,
        depositionRate: 10 + Math.random() * 20,
        age: 0,
        tick,
      })
    }

    for (const f of this.formations) {
      f.age += 0.004
      f.mineralDensity = Math.min(90, f.mineralDensity + 0.007)
      f.porosity = Math.max(5, f.porosity - 0.005)
      f.thermalGradient = Math.max(10, f.thermalGradient - 0.006)
    }

    for (let _i = this.formations.length - 1; _i >= 0; _i--) { if (!((f) => f.age < 94)(this.formations[_i])) this.formations.splice(_i, 1) }
  }

}
