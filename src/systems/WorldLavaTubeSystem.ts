// World Lava Tube System (v3.199) - Underground tunnels formed by flowing lava
// Lava tubes provide shelter, unique minerals, and hidden passages

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface LavaTube {
  id: number
  x: number
  y: number
  length: number
  diameter: number
  stability: number
  mineralDeposits: number
  temperature: number
  explored: boolean
  tick: number
}

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.003
const MAX_TUBES = 15

export class WorldLavaTubeSystem {
  private tubes: LavaTube[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tubes.length < MAX_TUBES && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form in volcanic/mountain terrain
      if (tile !== null && tile >= 6 && tile <= 7) {
        this.tubes.push({
          id: this.nextId++,
          x, y,
          length: 20 + Math.random() * 80,
          diameter: 2 + Math.random() * 8,
          stability: 60 + Math.random() * 40,
          mineralDeposits: 10 + Math.random() * 50,
          temperature: 30 + Math.random() * 70,
          explored: false,
          tick,
        })
      }
    }

    for (const t of this.tubes) {
      t.temperature = Math.max(15, t.temperature - 0.05)
      t.stability = Math.max(0, t.stability - 0.02)
      t.mineralDeposits = Math.max(0, t.mineralDeposits - 0.01)
      if (t.temperature < 40 && Math.random() < 0.01) {
        t.explored = true
      }
    }

    for (let i = this.tubes.length - 1; i >= 0; i--) {
      if (this.tubes[i].stability <= 0) {
        this.tubes.splice(i, 1)
      }
    }
  }

  getTubes(): readonly LavaTube[] { return this.tubes }
}
