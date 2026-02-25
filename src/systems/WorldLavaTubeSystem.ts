// World Lava Tube System (v3.444) - Lava tube formations
// Tunnels formed by flowing lava beneath a hardened surface crust

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface LavaTube {
  id: number
  x: number
  y: number
  length: number
  diameter: number
  crustThickness: number
  internalTemp: number
  collapseRisk: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2680
const FORM_CHANCE = 0.0011
const MAX_TUBES = 12

export class WorldLavaTubeSystem {
  private tubes: LavaTube[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tubes.length < MAX_TUBES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.LAVA) {
        this.tubes.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 50,
          diameter: 2 + Math.random() * 8,
          crustThickness: 1 + Math.random() * 5,
          internalTemp: 200 + Math.random() * 800,
          collapseRisk: 10 + Math.random() * 30,
          spectacle: 25 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const t of this.tubes) {
      t.internalTemp = Math.max(15, t.internalTemp - 0.002)
      t.crustThickness = Math.min(10, t.crustThickness + 0.000003)
      t.collapseRisk = Math.max(5, Math.min(60, t.collapseRisk + (Math.random() - 0.48) * 0.07))
      t.spectacle = Math.max(10, Math.min(70, t.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 96000
    for (let i = this.tubes.length - 1; i >= 0; i--) {
      if (this.tubes[i].tick < cutoff) this.tubes.splice(i, 1)
    }
  }

  getTubes(): LavaTube[] { return this.tubes }
}
