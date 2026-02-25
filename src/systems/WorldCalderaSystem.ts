// World Caldera System (v3.292) - Volcanic caldera formations
// Large crater-like depressions formed by volcanic eruption and collapse

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Caldera {
  id: number
  x: number
  y: number
  radius: number
  depth: number
  lakeLevel: number
  geothermalActivity: number
  rimIntegrity: number
  gasEmissions: number
  tick: number
}

const CHECK_INTERVAL = 3000
const FORM_CHANCE = 0.0012
const MAX_CALDERAS = 10

export class WorldCalderaSystem {
  private calderas: Caldera[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.calderas.length < MAX_CALDERAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 15 + Math.floor(Math.random() * (w - 30))
      const y = 15 + Math.floor(Math.random() * (h - 30))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.LAVA) {
        this.calderas.push({
          id: this.nextId++,
          x, y,
          radius: 5 + Math.floor(Math.random() * 6),
          depth: 80 + Math.random() * 120,
          lakeLevel: Math.random() * 30,
          geothermalActivity: 20 + Math.random() * 50,
          rimIntegrity: 50 + Math.random() * 40,
          gasEmissions: 10 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const caldera of this.calderas) {
      caldera.lakeLevel = Math.min(80, caldera.lakeLevel + 0.003)
      caldera.geothermalActivity = Math.max(5, Math.min(80, caldera.geothermalActivity + (Math.random() - 0.5) * 0.2))
      caldera.rimIntegrity = Math.max(20, caldera.rimIntegrity - 0.002)
      caldera.gasEmissions = Math.max(2, Math.min(60, caldera.gasEmissions + (caldera.geothermalActivity - 30) * 0.001))
    }

    const cutoff = tick - 100000
    for (let i = this.calderas.length - 1; i >= 0; i--) {
      if (this.calderas[i].tick < cutoff) this.calderas.splice(i, 1)
    }
  }

  getCalderas(): Caldera[] { return this.calderas }
}
