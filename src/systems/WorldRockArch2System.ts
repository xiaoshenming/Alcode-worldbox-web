// World Rock Arch System (v3.432) - Natural rock arch formations
// Curved rock spans formed by differential erosion of layered stone

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RockArch2 {
  id: number
  x: number
  y: number
  spanWidth: number
  archHeight: number
  thickness: number
  stability: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2610
const FORM_CHANCE = 0.0012
const MAX_ARCHES = 13

export class WorldRockArch2System {
  private arches: RockArch2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arches.length < MAX_ARCHES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.arches.push({
          id: this.nextId++,
          x, y,
          spanWidth: 5 + Math.random() * 15,
          archHeight: 4 + Math.random() * 12,
          thickness: 2 + Math.random() * 6,
          stability: 45 + Math.random() * 40,
          erosionRate: 0.001 + Math.random() * 0.003,
          spectacle: 25 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const a of this.arches) {
      a.thickness = Math.max(0.5, a.thickness - a.erosionRate * 0.008)
      a.stability = Math.max(8, a.stability - 0.00003)
      a.spectacle = Math.max(10, Math.min(70, a.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 91000
    for (let i = this.arches.length - 1; i >= 0; i--) {
      if (this.arches[i].tick < cutoff) this.arches.splice(i, 1)
    }
  }

  getArches(): RockArch2[] { return this.arches }
}
