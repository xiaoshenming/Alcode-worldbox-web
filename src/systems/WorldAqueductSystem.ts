// World Aqueduct System (v3.116) - Civilizations build aqueducts to transport water
// Aqueducts connect water sources to settlements, boosting growth and agriculture

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AqueductMaterial = 'stone' | 'brick' | 'marble' | 'reinforced'

export interface Aqueduct {
  id: number
  srcX: number
  srcY: number
  dstX: number
  dstY: number
  material: AqueductMaterial
  flowRate: number
  integrity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 3500
const BUILD_CHANCE = 0.003
const MAX_AQUEDUCTS = 12

const MATERIALS: AqueductMaterial[] = ['stone', 'brick', 'marble', 'reinforced']
const FLOW_RATE: Record<AqueductMaterial, number> = {
  stone: 5, brick: 10, marble: 18, reinforced: 30,
}

export class WorldAqueductSystem {
  private aqueducts: Aqueduct[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build aqueducts from water to grassland
    if (this.aqueducts.length < MAX_AQUEDUCTS && Math.random() < BUILD_CHANCE) {
      const srcX = Math.floor(Math.random() * world.width)
      const srcY = Math.floor(Math.random() * world.height)
      const srcTile = world.getTile(srcX, srcY)

      if (srcTile != null && (srcTile === 0 || srcTile === 1)) {
        const dstX = srcX + Math.floor(Math.random() * 20) - 10
        const dstY = srcY + Math.floor(Math.random() * 20) - 10
        if (dstX >= 0 && dstX < world.width && dstY >= 0 && dstY < world.height) {
          const dstTile = world.getTile(dstX, dstY)
          if (dstTile != null && dstTile === 3) {
            const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)]
            this.aqueducts.push({
              id: this.nextId++,
              srcX, srcY, dstX, dstY,
              material,
              flowRate: FLOW_RATE[material],
              integrity: 100,
              age: 0,
              tick,
            })
          }
        }
      }
    }

    // Update aqueducts
    for (const a of this.aqueducts) {
      a.age = tick - a.tick
      // Integrity degrades over time
      if (a.age > 60000) {
        a.integrity = Math.max(5, a.integrity - 0.08)
      }
      // Flow rate depends on integrity
      a.flowRate = FLOW_RATE[a.material] * (a.integrity / 100)
    }

    // Remove collapsed aqueducts
    for (let i = this.aqueducts.length - 1; i >= 0; i--) {
      if (this.aqueducts[i].integrity <= 5) this.aqueducts.splice(i, 1)
    }
  }

}
