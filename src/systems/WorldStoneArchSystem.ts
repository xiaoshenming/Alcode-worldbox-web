// World Stone Arch System (v3.408) - Natural stone arch formations
// Rock arches formed by erosion creating freestanding curved openings

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface StoneArch {
  id: number
  x: number
  y: number
  span: number
  height: number
  thickness: number
  rockType: number
  structuralIntegrity: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0012
const MAX_ARCHES = 12

export class WorldStoneArchSystem {
  private arches: StoneArch[] = []
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
          span: 5 + Math.random() * 30,
          height: 3 + Math.random() * 20,
          thickness: 2 + Math.random() * 8,
          rockType: Math.floor(Math.random() * 4),
          structuralIntegrity: 50 + Math.random() * 40,
          spectacle: 25 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const a of this.arches) {
      a.thickness = Math.max(0.5, a.thickness - 0.000008)
      a.structuralIntegrity = Math.max(10, a.structuralIntegrity - 0.00002)
      a.spectacle = Math.max(10, Math.min(75, a.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 94000
    for (let i = this.arches.length - 1; i >= 0; i--) {
      if (this.arches[i].tick < cutoff) this.arches.splice(i, 1)
    }
  }

  getArches(): StoneArch[] { return this.arches }
}
