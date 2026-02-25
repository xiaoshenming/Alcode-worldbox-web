// World Terracing System (v3.112) - Hillside terrace farming
// Civilizations carve terraces into hillsides for agriculture

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TerraceStage = 'carving' | 'irrigating' | 'planted' | 'harvesting'

export interface Terrace {
  id: number
  x: number
  y: number
  stage: TerraceStage
  levels: number
  fertility: number
  waterAccess: number
  yield: number
  tick: number
}

const CHECK_INTERVAL = 3000
const BUILD_CHANCE = 0.003
const MAX_TERRACES = 25

export class WorldTerracingSystem {
  private terraces: Terrace[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build terraces on hills
    if (this.terraces.length < MAX_TERRACES && Math.random() < BUILD_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && (tile === 4 || tile === 5)) {
        this.terraces.push({
          id: this.nextId++,
          x, y,
          stage: 'carving',
          levels: 2 + Math.floor(Math.random() * 4),
          fertility: 30 + Math.floor(Math.random() * 40),
          waterAccess: 20 + Math.floor(Math.random() * 50),
          yield: 0,
          tick,
        })
      }
    }

    // Advance terrace stages
    for (const t of this.terraces) {
      switch (t.stage) {
        case 'carving':
          if (Math.random() < 0.05) t.stage = 'irrigating'
          break
        case 'irrigating':
          t.waterAccess = Math.min(100, t.waterAccess + 1)
          if (t.waterAccess > 70) t.stage = 'planted'
          break
        case 'planted':
          t.fertility += 0.3
          if (t.fertility > 80) t.stage = 'harvesting'
          break
        case 'harvesting':
          t.yield += t.levels * t.fertility * 0.01
          t.fertility -= 0.5
          if (t.fertility < 30) { t.stage = 'planted'; t.fertility = 30 }
          break
      }
    }

    // Remove old terraces
    const cutoff = tick - 200000
    for (let i = this.terraces.length - 1; i >= 0; i--) {
      if (this.terraces[i].tick < cutoff) this.terraces.splice(i, 1)
    }
  }

  getTerraces(): readonly Terrace[] { return this.terraces }
}
