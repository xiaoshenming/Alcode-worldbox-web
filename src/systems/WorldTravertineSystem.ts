// World Travertine System (v3.489) - Travertine formations
// Mineral deposits formed by precipitation from geothermal springs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface TravertineFormation {
  id: number
  x: number
  y: number
  thickness: number
  mineralPurity: number
  depositionRate: number
  porosity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2760
const FORM_CHANCE = 0.0007
const MAX_FORMATIONS = 6

export class WorldTravertineSystem {
  private formations: TravertineFormation[] = []
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
        thickness: 5 + Math.random() * 15,
        mineralPurity: 40 + Math.random() * 35,
        depositionRate: 10 + Math.random() * 20,
        porosity: 20 + Math.random() * 30,
        age: 0,
        tick,
      })
    }

    for (const f of this.formations) {
      f.age += 0.003
      f.thickness = Math.min(80, f.thickness + 0.01)
      f.mineralPurity = Math.max(20, f.mineralPurity - 0.004)
      f.depositionRate = Math.max(3, f.depositionRate - 0.003)
    }

    this.formations = this.formations.filter(f => f.age < 98)
  }

  getFormations(): TravertineFormation[] { return this.formations }
}
