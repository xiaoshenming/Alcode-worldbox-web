// World Mangrove Swamp System (v3.192) - Coastal mangrove ecosystems form in warm shallow waters
// Mangroves protect coastlines, filter water, and provide nursery habitat for marine life

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface MangroveSwamp {
  id: number
  x: number
  y: number
  density: number
  rootDepth: number
  biodiversity: number
  coastalProtection: number
  waterFiltration: number
  tick: number
}

const CHECK_INTERVAL = 1600
const SPAWN_CHANCE = 0.004
const MAX_SWAMPS = 20

export class WorldMangroveSwampSystem {
  private swamps: MangroveSwamp[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.swamps.length < MAX_SWAMPS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form in shallow water near coastlines
      if (tile !== null && tile >= 1 && tile <= 2) {
        const density = 10 + Math.random() * 40
        this.swamps.push({
          id: this.nextId++,
          x, y,
          density,
          rootDepth: 1 + Math.random() * 5,
          biodiversity: 5 + Math.random() * 30,
          coastalProtection: density * 0.8,
          waterFiltration: density * 0.6,
          tick,
        })
      }
    }

    for (const s of this.swamps) {
      s.density = Math.min(100, s.density + 0.15)
      s.rootDepth = Math.min(10, s.rootDepth + 0.02)
      s.biodiversity = Math.min(100, s.biodiversity + 0.1 * s.density / 50)
      s.coastalProtection = s.density * 0.8
      s.waterFiltration = s.density * 0.6
    }

    for (let i = this.swamps.length - 1; i >= 0; i--) {
      if (tick - this.swamps[i].tick > 80000 && this.swamps[i].density < 15) {
        this.swamps.splice(i, 1)
      }
    }
  }

}
