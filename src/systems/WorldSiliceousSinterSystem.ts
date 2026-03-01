// World Siliceous Sinter System (v3.501) - Siliceous sinter deposits
// Amorphous silica deposits formed around hot springs and geysers

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SiliceousSinter {
  id: number
  x: number
  y: number
  silicaPurity: number
  layerCount: number
  opalescence: number
  thermalActivity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2790
const FORM_CHANCE = 0.0007
const MAX_DEPOSITS = 5

export class WorldSiliceousSinterSystem {
  private deposits: SiliceousSinter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.deposits.length < MAX_DEPOSITS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.deposits.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        silicaPurity: 45 + Math.random() * 35,
        layerCount: 3 + Math.floor(Math.random() * 10),
        opalescence: 10 + Math.random() * 30,
        thermalActivity: 30 + Math.random() * 40,
        age: 0,
        tick,
      })
    }

    for (const d of this.deposits) {
      d.age += 0.003
      d.silicaPurity = Math.max(20, d.silicaPurity - 0.003)
      d.opalescence = Math.min(80, d.opalescence + 0.007)
      d.thermalActivity = Math.max(8, d.thermalActivity - 0.005)
    }

    for (let _i = this.deposits.length - 1; _i >= 0; _i--) { if (!((d) => d.age < 97)(this.deposits[_i])) this.deposits.splice(_i, 1) }
  }

}
