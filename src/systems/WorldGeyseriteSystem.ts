// World Geyserite System (v3.492) - Geyserite mineral deposits
// Siliceous sinter deposits formed around geysers and hot springs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface GeyseriteDeposit {
  id: number
  x: number
  y: number
  silicaContent: number
  layerThickness: number
  crystallinity: number
  thermalProximity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2780
const FORM_CHANCE = 0.0007
const MAX_DEPOSITS = 6

export class WorldGeyseriteSystem {
  private deposits: GeyseriteDeposit[] = []
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
        silicaContent: 40 + Math.random() * 35,
        layerThickness: 5 + Math.random() * 15,
        crystallinity: 10 + Math.random() * 25,
        thermalProximity: 30 + Math.random() * 40,
        age: 0,
        tick,
      })
    }

    for (const d of this.deposits) {
      d.age += 0.003
      d.layerThickness = Math.min(75, d.layerThickness + 0.008)
      d.crystallinity = Math.min(85, d.crystallinity + 0.006)
      d.thermalProximity = Math.max(10, d.thermalProximity - 0.004)
    }

    this.deposits = this.deposits.filter(d => d.age < 96)
  }

  getDeposits(): GeyseriteDeposit[] { return this.deposits }
}
