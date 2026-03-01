// World Pediment System (v3.360) - Pediment formations
// Gently sloping erosional surfaces at the base of mountain fronts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Pediment {
  id: number
  x: number
  y: number
  area: number
  slope: number
  erosionAge: number
  sedimentThickness: number
  drainagePattern: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0014
const MAX_PEDIMENTS = 15

export class WorldPedimentSystem {
  private pediments: Pediment[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pediments.length < MAX_PEDIMENTS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.pediments.push({
          id: this.nextId++,
          x, y,
          area: 30 + Math.random() * 60,
          slope: 2 + Math.random() * 8,
          erosionAge: 50 + Math.random() * 300,
          sedimentThickness: 3 + Math.random() * 15,
          drainagePattern: Math.floor(Math.random() * 4),
          spectacle: 8 + Math.random() * 25,
          tick,
        })
      }
    }

    for (const p of this.pediments) {
      p.slope = Math.max(1, Math.min(12, p.slope - 0.00002))
      p.sedimentThickness = Math.min(30, p.sedimentThickness + 0.00003)
      p.area = Math.min(100, p.area + 0.00002)
      p.spectacle = Math.max(5, Math.min(50, p.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.pediments.length - 1; i >= 0; i--) {
      if (this.pediments[i].tick < cutoff) this.pediments.splice(i, 1)
    }
  }

}
