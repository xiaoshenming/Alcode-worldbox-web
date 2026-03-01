// World Labyrinth System (v3.109) - Natural maze-like terrain formations
// Labyrinths form in rocky areas, trapping creatures and hiding treasures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type LabyrinthType = 'cave' | 'hedge' | 'stone' | 'ice'

export interface Labyrinth {
  id: number
  x: number
  y: number
  type: LabyrinthType
  size: number
  complexity: number
  explored: number
  hasTreasure: boolean
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.002
const MAX_LABYRINTHS = 12

export class WorldLabyrinthSystem {
  private labyrinths: Labyrinth[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn labyrinths in appropriate terrain
    if (this.labyrinths.length < MAX_LABYRINTHS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile >= 4) {
        let type: LabyrinthType = 'stone'
        if (tile === 6) type = 'ice'
        else if (tile === 4) type = 'hedge'
        else if (tile >= 5) type = 'cave'

        this.labyrinths.push({
          id: this.nextId++,
          x, y,
          type,
          size: 5 + Math.floor(Math.random() * 15),
          complexity: 20 + Math.floor(Math.random() * 80),
          explored: 0,
          hasTreasure: Math.random() < 0.4,
          tick,
        })
      }
    }

    // Gradually explored by nearby creatures
    for (const lab of this.labyrinths) {
      if (lab.explored < 100) {
        lab.explored = Math.min(100, lab.explored + 0.1)
      }
    }

    // Remove fully explored labyrinths after time
    const cutoff = tick - 150000
    for (let i = this.labyrinths.length - 1; i >= 0; i--) {
      const lab = this.labyrinths[i]
      if (lab.explored >= 100 && lab.tick < cutoff) {
        this.labyrinths.splice(i, 1)
      }
    }
  }

}
