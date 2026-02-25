/**
 * WorldAgeSystem - Tracks the world's age and applies visual/gameplay changes as the world
 * progresses through geological and civilizational epochs.
 *
 * Epochs: PRIMORDIAL -> ANCIENT -> CLASSICAL -> MEDIEVAL -> MODERN
 * Each epoch shifts terrain distribution, disaster frequency, resource regeneration,
 * creature spawn rates, and the renderer's color overlay.
 */

import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

/** World epoch identifiers */
export type WorldEpoch = 'PRIMORDIAL' | 'ANCIENT' | 'CLASSICAL' | 'MEDIEVAL' | 'MODERN'

/** RGBA color overlay returned to the renderer */
export interface ColorOverlay {
  r: number
  g: number
  b: number
  a: number
}

interface EpochConfig {
  name: WorldEpoch
  displayName: string
  startTick: number
  endTick: number          // Infinity for the final epoch
  disasterFrequency: number // multiplier (1 = normal)
  resourceRegen: number     // multiplier (1 = normal)
  terrainDriftChance: number // per-tile probability per drift pass
  creatureSpawnRate: number  // multiplier (1 = normal)
  overlay: ColorOverlay
}

const EPOCH_CONFIGS: EpochConfig[] = [
  {
    name: 'PRIMORDIAL', displayName: '太初', startTick: 0, endTick: 500,
    disasterFrequency: 2.0, resourceRegen: 0.4, terrainDriftChance: 0.06,
    creatureSpawnRate: 0.3,
    overlay: { r: 180, g: 60, b: 20, a: 0.08 },
  },
  {
    name: 'ANCIENT', displayName: '远古', startTick: 500, endTick: 2000,
    disasterFrequency: 1.2, resourceRegen: 1.2, terrainDriftChance: 0.04,
    creatureSpawnRate: 0.8,
    overlay: { r: 40, g: 120, b: 30, a: 0.05 },
  },
  {
    name: 'CLASSICAL', displayName: '古典', startTick: 2000, endTick: 5000,
    disasterFrequency: 1.0, resourceRegen: 1.0, terrainDriftChance: 0.02,
    creatureSpawnRate: 1.0,
    overlay: { r: 200, g: 180, b: 120, a: 0.03 },
  },
  {
    name: 'MEDIEVAL', displayName: '中世纪', startTick: 5000, endTick: 10000,
    disasterFrequency: 0.8, resourceRegen: 0.9, terrainDriftChance: 0.015,
    creatureSpawnRate: 1.1,
    overlay: { r: 100, g: 90, b: 70, a: 0.04 },
  },
  {
    name: 'MODERN', displayName: '现代', startTick: 10000, endTick: Infinity,
    disasterFrequency: 0.6, resourceRegen: 0.7, terrainDriftChance: 0.01,
    creatureSpawnRate: 1.3,
    overlay: { r: 140, g: 140, b: 160, a: 0.06 },
  },
]

const DIRS: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DRIFT_INTERVAL = 300   // ticks between terrain drift passes
const SAMPLE_RATIO = 0.02    // fraction of tiles sampled per pass

/**
 * WorldAgeSystem tracks the cumulative age of the world and applies epoch-dependent
 * modifiers to terrain, disasters, resources, and visuals.
 */
export class WorldAgeSystem {
  private worldTick: number = 0
  private currentEpochIndex: number = 0
  private sampleCount: number

  constructor() {
    this.sampleCount = Math.floor(WORLD_WIDTH * WORLD_HEIGHT * SAMPLE_RATIO)
  }

  /**
   * Advance the world age by one tick and optionally apply terrain drift.
   * @param tick - Current global tick counter
   * @param world - The world map to apply terrain drift to
   */
  update(tick: number, world: World): void {
    this.worldTick = tick

    // Resolve current epoch
    this.currentEpochIndex = this.resolveEpochIndex(tick)

    // Terrain drift on interval
    if (tick > 0 && tick % DRIFT_INTERVAL === 0) {
      this.applyTerrainDrift(world)
    }
  }

  /** Returns the name of the current epoch. */
  getCurrentEpoch(): WorldEpoch {
    return EPOCH_CONFIGS[this.currentEpochIndex].name
  }

  /** Returns the display name (Chinese) of the current epoch. */
  getEpochDisplayName(): string {
    return EPOCH_CONFIGS[this.currentEpochIndex].displayName
  }

  /**
   * Returns a 0-1 value representing progress within the current epoch.
   * For the final (unbounded) epoch, progress is clamped based on 20000 additional ticks.
   */
  getEpochProgress(): number {
    const cfg = EPOCH_CONFIGS[this.currentEpochIndex]
    if (cfg.endTick === Infinity) {
      const elapsed = this.worldTick - cfg.startTick
      return Math.min(1, elapsed / 20000)
    }
    const duration = cfg.endTick - cfg.startTick
    return Math.min(1, (this.worldTick - cfg.startTick) / duration)
  }

  /**
   * Returns the RGBA color overlay the renderer should composite over the world.
   * Smoothly interpolates between epochs during the first 200 ticks of a transition.
   */
  getColorOverlay(): ColorOverlay {
    const cfg = EPOCH_CONFIGS[this.currentEpochIndex]
    if (this.currentEpochIndex === 0) return { ...cfg.overlay }

    const ticksIntoEpoch = this.worldTick - cfg.startTick
    const transitionDuration = 200
    if (ticksIntoEpoch >= transitionDuration) return { ...cfg.overlay }

    // Blend from previous epoch
    const prev = EPOCH_CONFIGS[this.currentEpochIndex - 1]
    const t = ticksIntoEpoch / transitionDuration
    return {
      r: prev.overlay.r + (cfg.overlay.r - prev.overlay.r) * t,
      g: prev.overlay.g + (cfg.overlay.g - prev.overlay.g) * t,
      b: prev.overlay.b + (cfg.overlay.b - prev.overlay.b) * t,
      a: prev.overlay.a + (cfg.overlay.a - prev.overlay.a) * t,
    }
  }

  /** Returns a disaster frequency multiplier (>1 = more frequent). */
  getDisasterFrequencyModifier(): number {
    return EPOCH_CONFIGS[this.currentEpochIndex].disasterFrequency
  }

  /** Returns a resource regeneration multiplier (>1 = faster). */
  getResourceRegenModifier(): number {
    return EPOCH_CONFIGS[this.currentEpochIndex].resourceRegen
  }

  /** Returns the per-tile terrain drift probability for the current epoch. */
  getTerrainDriftChance(): number {
    return EPOCH_CONFIGS[this.currentEpochIndex].terrainDriftChance
  }

  /** Returns a creature spawn rate multiplier for the current epoch. */
  getCreatureSpawnRateModifier(): number {
    return EPOCH_CONFIGS[this.currentEpochIndex].creatureSpawnRate
  }

  /** Returns the total world age in ticks. */
  getWorldAge(): number {
    return this.worldTick
  }

  // --- Private helpers ---

  private resolveEpochIndex(tick: number): number {
    for (let i = EPOCH_CONFIGS.length - 1; i >= 0; i--) {
      if (tick >= EPOCH_CONFIGS[i].startTick) return i
    }
    return 0
  }

  private applyTerrainDrift(world: World): void {
    const epoch = EPOCH_CONFIGS[this.currentEpochIndex].name
    const chance = this.getTerrainDriftChance()

    for (let i = 0; i < this.sampleCount; i++) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = world.getTile(x, y)
      if (tile === null) continue
      if (Math.random() >= chance) continue

      const neighbors = this.getNeighborTypes(world, x, y)
      const newTile = this.driftTile(tile, neighbors, epoch)
      if (newTile !== null && newTile !== tile) {
        world.setTile(x, y, newTile)
      }
    }
  }

  private driftTile(tile: TileType, neighbors: TileType[], epoch: WorldEpoch): TileType | null {
    switch (epoch) {
      case 'PRIMORDIAL':
        return this.driftPrimordial(tile, neighbors)
      case 'ANCIENT':
        return this.driftAncient(tile, neighbors)
      case 'CLASSICAL':
        return this.driftClassical(tile)
      case 'MEDIEVAL':
        return this.driftMedieval(tile, neighbors)
      case 'MODERN':
        return this.driftModern(tile, neighbors)
    }
  }

  /** PRIMORDIAL: volcanic, barren — lava spreads, sand dominates */
  private driftPrimordial(tile: TileType, neighbors: TileType[]): TileType | null {
    if (tile === TileType.GRASS && Math.random() < 0.15) return TileType.SAND
    if (tile === TileType.SAND && neighbors.includes(TileType.LAVA) && Math.random() < 0.1) {
      return TileType.LAVA
    }
    if (tile === TileType.FOREST && Math.random() < 0.2) return TileType.GRASS
    return null
  }

  /** ANCIENT: greening — grass spreads into sand, forests grow */
  private driftAncient(tile: TileType, neighbors: TileType[]): TileType | null {
    if (tile === TileType.SAND && neighbors.includes(TileType.GRASS) && Math.random() < 0.12) {
      return TileType.GRASS
    }
    if (tile === TileType.GRASS && neighbors.includes(TileType.FOREST) && Math.random() < 0.08) {
      return TileType.FOREST
    }
    if (tile === TileType.LAVA && Math.random() < 0.15) return TileType.MOUNTAIN
    return null
  }

  /** CLASSICAL: balanced — slight forest growth, mountains stabilize */
  private driftClassical(tile: TileType): TileType | null {
    if (tile === TileType.LAVA && Math.random() < 0.2) return TileType.MOUNTAIN
    return null
  }

  /** MEDIEVAL: farmland expansion — forests thin near grass, sand recedes */
  private driftMedieval(tile: TileType, neighbors: TileType[]): TileType | null {
    if (tile === TileType.FOREST && neighbors.includes(TileType.GRASS) && Math.random() < 0.06) {
      return TileType.GRASS
    }
    if (tile === TileType.SAND && neighbors.includes(TileType.GRASS) && Math.random() < 0.05) {
      return TileType.GRASS
    }
    return null
  }

  /** MODERN: urbanization — forests cleared, sand near cities becomes grass */
  private driftModern(tile: TileType, neighbors: TileType[]): TileType | null {
    if (tile === TileType.FOREST && Math.random() < 0.04) return TileType.GRASS
    if (tile === TileType.SAND && neighbors.includes(TileType.GRASS) && Math.random() < 0.03) {
      return TileType.GRASS
    }
    return null
  }

  private getNeighborTypes(world: World, x: number, y: number): TileType[] {
    const result: TileType[] = []
    for (const [dx, dy] of DIRS) {
      const t = world.getTile(x + dx, y + dy)
      if (t !== null) result.push(t)
    }
    return result
  }
}
