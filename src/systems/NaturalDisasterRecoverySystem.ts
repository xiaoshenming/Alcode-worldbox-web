// Natural Disaster Recovery System — post-disaster terrain restoration, building reconstruction, ecosystem recovery

import { TileType } from '../utils/Constants'
import { EventLog } from './EventLog'
import { World } from '../game/World'
import { EntityManager, PositionComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { BuildingComponent, BuildingType } from '../civilization/Civilization'

/** Disaster types that can trigger recovery zones */
export type DisasterType = 'earthquake' | 'fire' | 'flood' | 'meteor' | 'volcano'

/** A region undergoing post-disaster recovery */
export interface RecoveryZone {
  id: number
  centerX: number
  centerY: number
  radius: number
  disasterType: DisasterType
  /** 0 = just started, 1 = fully recovered */
  progress: number
  startTick: number
  /** Terrain tiles that were damaged and need restoration */
  damagedTiles: Array<{ x: number; y: number; originalType: TileType; restored: boolean }>
  /** Building positions that were destroyed and may be rebuilt */
  destroyedBuildings: Array<{ x: number; y: number; civId: number; rebuilt: boolean }>
}

/** Recovery speed multiplier per disaster type (lower = slower) */
const RECOVERY_SPEED: Record<DisasterType, number> = {
  fire: 1.5,
  flood: 1.2,
  earthquake: 0.8,
  volcano: 0.6,
  meteor: 0.4,
}

/** Terrain restoration sequence: damaged tile -> intermediate -> final */
const TERRAIN_STAGES: TileType[] = [TileType.SAND, TileType.GRASS, TileType.FOREST]

/** How often (in ticks) the system processes recovery */
const UPDATE_INTERVAL = 60

/** Base progress increment per update cycle */
const BASE_PROGRESS_RATE = 0.008

/** Max concurrent recovery zones */
const MAX_ZONES = 20

let nextZoneId = 1

/**
 * Manages post-disaster recovery across the world.
 *
 * After a disaster strikes, affected areas are registered as recovery zones.
 * Over time, terrain gradually restores (sand -> grass -> forest),
 * destroyed buildings are flagged for reconstruction by civilizations,
 * and the ecosystem rebounds. Different disaster types recover at different rates:
 * fire is fastest, meteor is slowest.
 */
export class NaturalDisasterRecoverySystem {
  private recoveryZones: RecoveryZone[] = []
  private tickCounter: number = 0

  /**
   * Register a new disaster-affected area for recovery.
   * Scans the zone for damaged terrain and destroyed buildings.
   */
  reportDisaster(
    x: number,
    y: number,
    radius: number,
    type: DisasterType,
    world: World,
    entityManager: EntityManager,
    tick: number
  ): number {
    if (this.recoveryZones.length >= MAX_ZONES) {
      // Evict the most-progressed zone to make room
      let maxIdx = 0
      for (let i = 1; i < this.recoveryZones.length; i++) {
        if (this.recoveryZones[i].progress > this.recoveryZones[maxIdx].progress) {
          maxIdx = i
        }
      }
      this.recoveryZones.splice(maxIdx, 1)
    }

    const damagedTiles = this.scanDamagedTiles(x, y, radius, world)
    const destroyedBuildings = this.scanDestroyedBuildings(x, y, radius, entityManager)

    const zoneId = nextZoneId++
    const zone: RecoveryZone = {
      id: zoneId,
      centerX: x,
      centerY: y,
      radius,
      disasterType: type,
      progress: 0,
      startTick: tick,
      damagedTiles,
      destroyedBuildings,
    }

    this.recoveryZones.push(zone)
    EventLog.log('disaster', `Recovery started near (${x},${y}) after ${type}`, tick)
    return zoneId
  }

  /**
   * Advance recovery for all active zones.
   * Called each game tick from the main loop.
   */
  update(dt: number, world: World, entityManager: EntityManager, civManager: CivManager): void {
    this.tickCounter++
    if (this.tickCounter % UPDATE_INTERVAL !== 0) return

    for (let i = this.recoveryZones.length - 1; i >= 0; i--) {
      const zone = this.recoveryZones[i]
      const speed = RECOVERY_SPEED[zone.disasterType]
      const progressDelta = BASE_PROGRESS_RATE * speed

      zone.progress = Math.min(1, zone.progress + progressDelta)

      this.restoreTerrain(zone, world)
      this.markBuildingsForReconstruction(zone, civManager, entityManager, world)

      if (zone.progress >= 1) {
        this.finalizeZone(zone, world)
        this.recoveryZones.splice(i, 1)
        EventLog.log('disaster', `Area near (${zone.centerX},${zone.centerY}) fully recovered from ${zone.disasterType}`, world.tick)
      }
    }
  }

  /** Returns all active recovery zones */
  getRecoveryZones(): ReadonlyArray<RecoveryZone> {
    return this.recoveryZones
  }

  /** Returns recovery progress (0-1) for a specific zone, or -1 if not found */
  getRecoveryProgress(zoneId: number): number {
    const zone = this.recoveryZones.find(z => z.id === zoneId)
    return zone ? zone.progress : -1
  }

  /** Returns the number of active recovery zones */
  getActiveZoneCount(): number {
    return this.recoveryZones.length
  }

  // --- Private helpers ---

  private scanDamagedTiles(
    cx: number,
    cy: number,
    radius: number,
    world: World
  ): RecoveryZone['damagedTiles'] {
    const result: RecoveryZone['damagedTiles'] = []
    const r2 = radius * radius

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue
        const tx = cx + dx
        const ty = cy + dy
        const tile = world.getTile(tx, ty)
        if (tile === null) continue

        // Track tiles that are in a "damaged" state (sand, lava) and could recover
        if (tile === TileType.SAND || tile === TileType.LAVA) {
          result.push({ x: tx, y: ty, originalType: TileType.GRASS, restored: false })
        }
      }
    }
    return result
  }

  private scanDestroyedBuildings(
    cx: number,
    cy: number,
    radius: number,
    entityManager: EntityManager
  ): RecoveryZone['destroyedBuildings'] {
    const result: RecoveryZone['destroyedBuildings'] = []
    const r2 = radius * radius
    const buildingEntities = entityManager.getEntitiesWithComponents('position', 'building')

    for (const eid of buildingEntities) {
      const pos = entityManager.getComponent<PositionComponent>(eid, 'position')
      const building = entityManager.getComponent<BuildingComponent>(eid, 'building')
      if (!pos || !building) continue

      const dx = pos.x - cx
      const dy = pos.y - cy
      if (dx * dx + dy * dy > r2) continue

      // Buildings with very low health are considered destroyed
      if (building.health <= building.maxHealth * 0.1) {
        result.push({ x: pos.x, y: pos.y, civId: building.civId, rebuilt: false })
      }
    }
    return result
  }

  private restoreTerrain(zone: RecoveryZone, world: World): void {
    // Determine which terrain stage we should be at based on progress
    const stageIndex = Math.min(
      TERRAIN_STAGES.length - 1,
      Math.floor(zone.progress * TERRAIN_STAGES.length)
    )
    const targetTile = TERRAIN_STAGES[stageIndex]

    for (const entry of zone.damagedTiles) {
      if (entry.restored) continue

      const currentTile = world.getTile(entry.x, entry.y)
      if (currentTile === null) continue

      // Skip water tiles — don't overwrite them
      if (currentTile === TileType.DEEP_WATER || currentTile === TileType.SHALLOW_WATER) {
        entry.restored = true
        continue
      }

      // Probabilistic restoration — not all tiles recover at once
      if (Math.random() > 0.3) continue

      // Lava cools to sand first
      if (currentTile === TileType.LAVA) {
        world.setTile(entry.x, entry.y, TileType.SAND)
        continue
      }

      // Progress through terrain stages
      const currentStageIdx = TERRAIN_STAGES.indexOf(currentTile)
      if (currentStageIdx >= 0 && currentStageIdx < stageIndex) {
        world.setTile(entry.x, entry.y, targetTile)
      }

      // Mark as fully restored if we've reached the final stage
      if (stageIndex === TERRAIN_STAGES.length - 1 && currentStageIdx >= stageIndex) {
        entry.restored = true
      }
    }
  }

  private markBuildingsForReconstruction(
    zone: RecoveryZone,
    civManager: CivManager,
    entityManager: EntityManager,
    world: World
  ): void {
    // Only start rebuilding after 40% recovery
    if (zone.progress < 0.4) return

    for (const entry of zone.destroyedBuildings) {
      if (entry.rebuilt) continue

      // Probabilistic — civilizations don't rebuild everything at once
      if (Math.random() > 0.05) continue

      // Check if the civilization still exists
      const civ = civManager.civilizations.get(entry.civId)
      if (!civ) continue

      // Check terrain is walkable before rebuilding
      const tile = world.getTile(entry.x, entry.y)
      if (
        tile === null ||
        tile === TileType.DEEP_WATER ||
        tile === TileType.SHALLOW_WATER ||
        tile === TileType.LAVA
      ) {
        continue
      }

      // Place a basic hut as reconstruction
      const buildingId = civManager.placeBuilding(entry.civId, BuildingType.HUT, entry.x, entry.y)
      if (buildingId !== null) {
        entry.rebuilt = true
        EventLog.log(
          'building',
          `${civ.name} rebuilt a structure at (${entry.x},${entry.y})`,
          world.tick
        )
      }
    }
  }

  private finalizeZone(zone: RecoveryZone, world: World): void {
    // Ensure all remaining damaged tiles get at least grass
    for (const entry of zone.damagedTiles) {
      if (entry.restored) continue
      const tile = world.getTile(entry.x, entry.y)
      if (tile === null) continue
      if (tile === TileType.SAND || tile === TileType.LAVA) {
        world.setTile(entry.x, entry.y, TileType.GRASS)
      }
      entry.restored = true
    }
  }
}
