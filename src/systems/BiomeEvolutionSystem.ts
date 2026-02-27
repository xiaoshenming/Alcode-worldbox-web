// Biome Evolution System
// Handles natural terrain transitions, civilization impact, and erosion over time

import { World } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { BuildingComponent, BuildingType } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

const EVOLUTION_INTERVAL = 600
const LAVA_COOL_INTERVAL = 1200
const SAMPLE_RATIO = 0.05

// Particle colors per terrain type
const TERRAIN_PARTICLE_COLOR: Partial<Record<TileType, string>> = {
  [TileType.GRASS]: '#5aac5a',
  [TileType.FOREST]: '#1a5a1a',
  [TileType.SAND]: '#d4c490',
  [TileType.MOUNTAIN]: '#5a5a6a',
  [TileType.SHALLOW_WATER]: '#2e6296',
}

// Orthogonal neighbor offsets
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const

export class BiomeEvolutionSystem {
  private sampleCount: number
  // Reusable maps to avoid GC per evolution tick (numeric key = cx * 10000 + cy)
  private _popDensity: Map<number, number> = new Map()
  private _buildingMap: Map<number, BuildingType> = new Map()

  constructor() {
    this.sampleCount = Math.floor(WORLD_WIDTH * WORLD_HEIGHT * SAMPLE_RATIO)
  }

  update(world: World, civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number): void {
    if (tick % EVOLUTION_INTERVAL !== 0) return

    const isLavaCoolTick = tick % LAVA_COOL_INTERVAL === 0

    // Build a quick lookup of population density and building positions
    const popDensity = this._popDensity
    const buildingMap = this._buildingMap
    this.buildPopDensityMap(em, popDensity)
    this.buildBuildingMap(em, buildingMap)

    for (let i = 0; i < this.sampleCount; i++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = world.getTile(x, y)
      if (tile === null) continue

      const neighbors = this.getNeighborTypes(world, x, y)

      let newTile: TileType | null = null

      // --- Lava cooling ---
      if (tile === TileType.LAVA && isLavaCoolTick && Math.random() < 0.3) {
        newTile = TileType.MOUNTAIN
      }

      // --- Natural evolution ---
      if (newTile === null) {
        newTile = this.naturalEvolution(tile, neighbors)
      }

      // --- Civilization influence ---
      if (newTile === null) {
        newTile = this.civInfluence(tile, x, y, popDensity, buildingMap)
      }

      // --- Erosion ---
      if (newTile === null) {
        newTile = this.erosion(tile, neighbors)
      }

      // Apply change
      if (newTile !== null && newTile !== tile) {
        world.setTile(x, y, newTile)
        this.emitParticle(particles, x, y, newTile)
      }
    }
  }

  // --- Natural terrain transitions ---

  private naturalEvolution(tile: TileType, neighbors: TileType[]): TileType | null {
    switch (tile) {
      case TileType.SAND: {
        // Greening: sand near grass can become grass
        if (neighbors.includes(TileType.GRASS) && Math.random() < 0.08) {
          return TileType.GRASS
        }
        break
      }
      case TileType.GRASS: {
        // Forest expansion: grass near forest can become forest
        if (neighbors.includes(TileType.FOREST) && Math.random() < 0.05) {
          return TileType.FOREST
        }
        // Desertification: grass with no nearby water dries out
        const hasWater = neighbors.includes(TileType.SHALLOW_WATER) || neighbors.includes(TileType.DEEP_WATER)
        if (!hasWater && !neighbors.includes(TileType.FOREST) && Math.random() < 0.03) {
          return TileType.SAND
        }
        break
      }
      case TileType.SHALLOW_WATER: {
        // Beach formation at water edges
        const hasLand = neighbors.some(n => n === TileType.GRASS || n === TileType.FOREST || n === TileType.MOUNTAIN)
        if (hasLand && Math.random() < 0.02) {
          return TileType.SAND
        }
        break
      }
    }
    return null
  }

  // --- Civilization impact on terrain ---

  private civInfluence(
    tile: TileType, x: number, y: number,
    popDensity: Map<number, number>,
    buildingMap: Map<number, BuildingType>
  ): TileType | null {
    const density = this.getLocalDensity(popDensity, x, y, 6)

    if (tile === TileType.FOREST && density >= 3 && Math.random() < 0.06) {
      // Deforestation in populated areas
      // But skip if a farm is nearby (farms protect grassland, not forest)
      return TileType.GRASS
    }

    if (tile === TileType.GRASS && density >= 2) {
      // Farms nearby prevent desertification
      if (this.hasBuildingNearby(buildingMap, x, y, 5, BuildingType.FARM)) {
        return null // protected
      }
    }

    if (tile === TileType.MOUNTAIN) {
      // Mining areas slowly consume mountain
      if (this.hasBuildingNearby(buildingMap, x, y, 4, BuildingType.MINE) && Math.random() < 0.03) {
        return TileType.GRASS
      }
    }

    return null
  }

  // --- Erosion ---

  private erosion(tile: TileType, neighbors: TileType[]): TileType | null {
    if (tile === TileType.SAND) {
      // Water erosion: sand next to water can be consumed
      const waterCount = neighbors.filter(n => n === TileType.SHALLOW_WATER || n === TileType.DEEP_WATER).length
      if (waterCount >= 2 && Math.random() < 0.02) {
        return TileType.SHALLOW_WATER
      }
    }

    if (tile === TileType.MOUNTAIN) {
      // Mountain edge erosion
      const nonMountain = neighbors.filter(n => n !== TileType.MOUNTAIN && n !== TileType.SNOW).length
      if (nonMountain >= 3 && Math.random() < 0.01) {
        return TileType.GRASS
      }
    }

    return null
  }

  // --- Helpers ---

  private getNeighborTypes(world: World, x: number, y: number): TileType[] {
    const result: TileType[] = []
    for (const [dx, dy] of DIRS) {
      const t = world.getTile(x + dx, y + dy)
      if (t !== null) result.push(t)
    }
    return result
  }

  private buildPopDensityMap(em: EntityManager, map: Map<number, number>): void {
    map.clear()
    const entities = em.getEntitiesWithComponents('position', 'creature')
    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      // Bucket into 8x8 cells
      const key = Math.floor(pos.x / 8) * 10000 + Math.floor(pos.y / 8)
      map.set(key, (map.get(key) || 0) + 1)
    }
  }

  private buildBuildingMap(em: EntityManager, map: Map<number, BuildingType>): void {
    map.clear()
    const entities = em.getEntitiesWithComponents('position', 'building')
    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const bld = em.getComponent<BuildingComponent>(id, 'building')
      if (!pos || !bld) continue
      const key = Math.floor(pos.x) * 10000 + Math.floor(pos.y)
      map.set(key, bld.buildingType)
    }
  }

  private getLocalDensity(popMap: Map<number, number>, x: number, y: number, radius: number): number {
    const cellSize = 8
    const cx = Math.floor(x / cellSize)
    const cy = Math.floor(y / cellSize)
    const r = Math.ceil(radius / cellSize)
    let total = 0
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        total += popMap.get((cx + dx) * 10000 + (cy + dy)) || 0
      }
    }
    return total
  }

  private hasBuildingNearby(buildingMap: Map<number, BuildingType>, x: number, y: number, radius: number, type: BuildingType): boolean {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (buildingMap.get((x + dx) * 10000 + (y + dy)) === type) return true
      }
    }
    return false
  }

  private emitParticle(particles: ParticleSystem, x: number, y: number, tileType: TileType): void {
    const color = TERRAIN_PARTICLE_COLOR[tileType]
    if (!color) return
    particles.spawn(x + 0.5, y + 0.5, 3, color, 0.8)
  }
}
