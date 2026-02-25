// Creature Vision System (v2.91) - Creatures have vision range affecting exploration and combat
// Vision is influenced by terrain, weather, and time of day

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export interface VisionData {
  entityId: number
  range: number        // base vision range in tiles
  effectiveRange: number // after modifiers
  visibleEntities: number[]
  lastUpdate: number
}

const CHECK_INTERVAL = 300
const BASE_VISION = 8
const MAX_TRACKED = 200

const TERRAIN_VISION_MOD: Partial<Record<TileType, number>> = {
  [TileType.FOREST]: -3,
  [TileType.MOUNTAIN]: 4,
  [TileType.DEEP_WATER]: 2,
  [TileType.SNOW]: 1,
  [TileType.SAND]: 2,
}

export class CreatureVisionSystem {
  private visionMap = new Map<number, VisionData>()
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.updateVision(world, em, tick)
    this.pruneStale(em)
  }

  private updateVision(world: World, em: EntityManager, tick: number): void {
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const eid of entities) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      const tx = Math.floor(pos.x)
      const ty = Math.floor(pos.y)
      const tile = world.getTile(tx, ty)
      if (tile === null) continue

      const terrainMod = TERRAIN_VISION_MOD[tile] ?? 0
      const effectiveRange = Math.max(2, BASE_VISION + terrainMod)

      // Find visible entities within range
      const visible: number[] = []
      const allPos = em.getEntitiesWithComponents('position')

      for (const other of allPos) {
        if (other === eid) continue
        const op = em.getComponent<PositionComponent>(other, 'position')
        if (!op) continue

        const dx = op.x - pos.x
        const dy = op.y - pos.y
        if (dx * dx + dy * dy <= effectiveRange * effectiveRange) {
          visible.push(other)
        }
      }

      this.visionMap.set(eid, {
        entityId: eid,
        range: BASE_VISION,
        effectiveRange,
        visibleEntities: visible,
        lastUpdate: tick,
      })
    }
  }

  private pruneStale(_em: EntityManager): void {
    // Cap total tracked
    if (this.visionMap.size > MAX_TRACKED) {
      const entries = [...this.visionMap.entries()]
      entries.sort((a, b) => a[1].lastUpdate - b[1].lastUpdate)
      for (let i = 0; i < entries.length - MAX_TRACKED; i++) {
        this.visionMap.delete(entries[i][0])
      }
    }
  }

  getVision(entityId: number): VisionData | undefined {
    return this.visionMap.get(entityId)
  }

  getVisibleEntities(entityId: number): number[] {
    return this.visionMap.get(entityId)?.visibleEntities ?? []
  }

  getAllVisionData(): VisionData[] {
    return [...this.visionMap.values()]
  }
}
