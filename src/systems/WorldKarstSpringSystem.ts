// World Karst Spring System (v3.438) - Karst spring formations
// Springs emerging from limestone karst terrain with dissolved mineral content

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface KarstSpring {
  id: number
  x: number
  y: number
  flowRate: number
  mineralContent: number
  poolDepth: number
  waterClarity: number
  temperature: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2570
const FORM_CHANCE = 0.0013
const MAX_SPRINGS = 14

export class WorldKarstSpringSystem {
  private springs: KarstSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.springs.push({
          id: this.nextId++,
          x, y,
          flowRate: 5 + Math.random() * 20,
          mineralContent: 10 + Math.random() * 30,
          poolDepth: 1 + Math.random() * 6,
          waterClarity: 40 + Math.random() * 40,
          temperature: 8 + Math.random() * 25,
          spectacle: 20 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const s of this.springs) {
      s.flowRate = Math.max(1, Math.min(35, s.flowRate + (Math.random() - 0.48) * 0.08))
      s.mineralContent = Math.max(5, Math.min(50, s.mineralContent + (Math.random() - 0.47) * 0.06))
      s.waterClarity = Math.max(20, Math.min(90, s.waterClarity + (Math.random() - 0.46) * 0.07))
      s.spectacle = Math.max(10, Math.min(65, s.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 92000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

}
