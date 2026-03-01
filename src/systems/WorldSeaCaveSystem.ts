// World Sea Cave System (v3.435) - Coastal sea cave formations
// Caves formed by wave action eroding weaknesses in coastal cliffs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SeaCave {
  id: number
  x: number
  y: number
  depth: number
  entranceWidth: number
  ceilingHeight: number
  waveReach: number
  stability: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2630
const FORM_CHANCE = 0.0012
const MAX_CAVES = 13

export class WorldSeaCaveSystem {
  private caves: SeaCave[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.caves.length < MAX_CAVES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.MOUNTAIN) {
        this.caves.push({
          id: this.nextId++,
          x, y,
          depth: 5 + Math.random() * 20,
          entranceWidth: 3 + Math.random() * 8,
          ceilingHeight: 2 + Math.random() * 7,
          waveReach: 3 + Math.random() * 12,
          stability: 40 + Math.random() * 40,
          spectacle: 20 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const c of this.caves) {
      c.depth = Math.min(35, c.depth + 0.000005)
      c.entranceWidth = Math.min(15, c.entranceWidth + 0.000003)
      c.stability = Math.max(10, c.stability - 0.00003)
      c.spectacle = Math.max(10, Math.min(65, c.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 93000
    for (let i = this.caves.length - 1; i >= 0; i--) {
      if (this.caves[i].tick < cutoff) this.caves.splice(i, 1)
    }
  }

}
