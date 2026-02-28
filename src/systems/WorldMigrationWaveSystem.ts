/**
 * WorldMigrationWaveSystem - Large-scale population migration events
 * triggered by environmental pressures: drought, war, famine, overcrowding,
 * disasters, or opportunity. Creatures move in waves from stressed regions
 * to more hospitable areas, with a snowball effect along the path.
 */

import { EntityManager, EntityId, PositionComponent, AIComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { isWalkable } from '../utils/Pathfinding'
import { CivManager } from '../civilization/CivManager'
import { EventLog } from './EventLog'

/** Reasons that can trigger a migration wave */
export enum MigrationReason {
  DROUGHT = 'drought',
  WAR = 'war',
  FAMINE = 'famine',
  OVERCROWDING = 'overcrowding',
  DISASTER = 'disaster',
  OPPORTUNITY = 'opportunity'
}

/** A single active migration wave moving across the world */
export interface MigrationWave {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  reason: MigrationReason
  progress: number        // 0-1, how far the wave has traveled
  entityIds: Set<EntityId>
  scale: number           // initial size estimate
  startTick: number
}

const REASON_LABELS: Record<MigrationReason, string> = {
  [MigrationReason.DROUGHT]: 'drought',
  [MigrationReason.WAR]: 'war',
  [MigrationReason.FAMINE]: 'famine',
  [MigrationReason.OVERCROWDING]: 'overcrowding',
  [MigrationReason.DISASTER]: 'disaster',
  [MigrationReason.OPPORTUNITY]: 'opportunity'
}

let nextWaveId = 1

/**
 * Manages large-scale migration waves across the world.
 * Detects environmental stress in regions and organizes mass movement
 * of creatures toward better conditions. Creatures along the migration
 * path may join the wave (snowball effect).
 */
export class WorldMigrationWaveSystem {
  private activeWaves: MigrationWave[] = []
  private _cellCounts: Map<number, EntityId[]> = new Map()  // reused across detectTriggers calls

  private static CHECK_INTERVAL = 180       // check triggers every 3 seconds
  private static MOVE_INTERVAL = 2          // move entities every 2 ticks
  private static MAX_WAVES = 8
  private static WAVE_SPEED = 0.003
  private static SNOWBALL_RADIUS = 6
  private static SNOWBALL_CHANCE = 0.25
  private static SCAN_RADIUS = 12
  private static MIN_CREATURES_FOR_WAVE = 4
  // Reusable buffer for advanceWaves (every 2 ticks)
  private _wavesToRemoveBuf: number[] = []

  /**
   * Main update loop. Checks for new migration triggers and advances
   * active waves each tick.
   */
  update(dt: number, em: EntityManager, world: World, civManager: CivManager): void {
    const tick = world.tick

    // Periodically scan for migration triggers
    if (tick % WorldMigrationWaveSystem.CHECK_INTERVAL === 0) {
      this.detectTriggers(em, world, civManager)
    }

    // Advance active waves
    if (tick % WorldMigrationWaveSystem.MOVE_INTERVAL === 0) {
      this.advanceWaves(em, world)
    }
  }

  /**
   * Manually trigger a migration wave from one region to another.
   */
  triggerWave(fromX: number, fromY: number, toX: number, toY: number, reason: MigrationReason): MigrationWave | null {
    if (this.activeWaves.length >= WorldMigrationWaveSystem.MAX_WAVES) return null
    if (fromX < 0 || fromX >= WORLD_WIDTH || fromY < 0 || fromY >= WORLD_HEIGHT) return null
    if (toX < 0 || toX >= WORLD_WIDTH || toY < 0 || toY >= WORLD_HEIGHT) return null

    const wave: MigrationWave = {
      id: nextWaveId++,
      fromX, fromY,
      toX, toY,
      reason,
      progress: 0,
      entityIds: new Set(),
      scale: 0,
      startTick: 0
    }
    this.activeWaves.push(wave)
    return wave
  }

  /** Returns all currently active migration waves (read-only snapshot). */
  getActiveWaves(): ReadonlyArray<Readonly<MigrationWave>> {
    return this.activeWaves
  }

  /**
   * Scan the world for regions under environmental stress and create waves.
   */
  private detectTriggers(em: EntityManager, world: World, civManager: CivManager): void {
    if (this.activeWaves.length >= WorldMigrationWaveSystem.MAX_WAVES) return

    const creatures = em.getEntitiesWithComponents('position', 'creature', 'ai')
    if (creatures.length < WorldMigrationWaveSystem.MIN_CREATURES_FOR_WAVE) return

    // Build spatial grid of creature density (cell = 16 tiles)
    const cellSize = 16
    const cellCounts = this._cellCounts  // reused map — clear arrays, reuse map itself
    cellCounts.clear()

    for (const id of creatures) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const key = Math.floor(pos.x / cellSize) * 10000 + Math.floor(pos.y / cellSize)
      let arr = cellCounts.get(key)
      if (!arr) {
        arr = []
        cellCounts.set(key, arr)
      }
      arr.push(id)
    }

    // Evaluate each populated cell for stress
    for (const [key, ids] of cellCounts) {
      if (this.activeWaves.length >= WorldMigrationWaveSystem.MAX_WAVES) break
      if (ids.length < WorldMigrationWaveSystem.MIN_CREATURES_FOR_WAVE) continue

      const cx = Math.floor(key / 10000)
      const cy = key % 10000
      const centerX = cx * cellSize + cellSize / 2
      const centerY = cy * cellSize + cellSize / 2

      // Skip if already part of an active wave origin
      if (this.isNearExistingWaveOrigin(centerX, centerY, 20)) continue

      const reason = this.evaluateStress(centerX, centerY, ids, em, world, civManager)
      if (!reason) continue

      // Random gate to avoid too many waves
      if (Math.random() > 0.12) continue

      // Find a suitable destination
      const dest = this.findDestination(world, civManager, centerX, centerY, reason)
      if (!dest) continue

      // Recruit nearby creatures (filter out those already migrating)
      const recruits = new Set<EntityId>()
      for (const id of ids) {
        const ai = em.getComponent<AIComponent>(id, 'ai')
        if (ai && ai.state !== 'migrating') {
          recruits.add(id)
        }
      }
      if (recruits.size < WorldMigrationWaveSystem.MIN_CREATURES_FOR_WAVE) continue

      const wave: MigrationWave = {
        id: nextWaveId++,
        fromX: centerX,
        fromY: centerY,
        toX: dest.x,
        toY: dest.y,
        reason,
        progress: 0,
        entityIds: recruits,
        scale: recruits.size,
        startTick: world.tick
      }
      this.activeWaves.push(wave)

      // Set recruited creatures to migrating
      for (const id of recruits) {
        const ai = em.getComponent<AIComponent>(id, 'ai')
        if (!ai) continue
        ai.state = 'migrating'
        ai.targetX = dest.x
        ai.targetY = dest.y
      }

      EventLog.log(
        'world_event',
        `A migration wave of ${recruits.size} creatures flees ${REASON_LABELS[reason]} toward (${dest.x},${dest.y})`,
        world.tick
      )
    }
  }

  /**
   * Evaluate environmental stress at a location. Returns the dominant
   * stress reason, or null if conditions are acceptable.
   */
  private evaluateStress(
    cx: number, cy: number, ids: EntityId[],
    em: EntityManager, world: World, civManager: CivManager
  ): MigrationReason | null {
    const r = WorldMigrationWaveSystem.SCAN_RADIUS
    let grassCount = 0
    let lavaCount = 0
    let totalLand = 0

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tile = world.getTile(Math.floor(cx) + dx, Math.floor(cy) + dy)
        if (tile === null) continue
        if (tile === TileType.GRASS || tile === TileType.FOREST) grassCount++
        if (tile === TileType.LAVA) lavaCount++
        if (tile !== TileType.DEEP_WATER && tile !== TileType.SHALLOW_WATER) totalLand++
      }
    }

    if (totalLand === 0) return null

    // Disaster: lava presence
    if (lavaCount > 5) return MigrationReason.DISASTER

    // Famine / Drought: very low food tiles
    const foodRatio = grassCount / totalLand
    if (foodRatio < 0.15) return MigrationReason.FAMINE
    if (foodRatio < 0.25 && world.season === 'summer') return MigrationReason.DROUGHT

    // Overcrowding: too many creatures in a small area
    if (ids.length > 20) return MigrationReason.OVERCROWDING

    // War: check if many creatures are in attacking state
    let attackingCount = 0
    for (const id of ids) {
      const ai = em.getComponent<AIComponent>(id, 'ai')
      if (ai && ai.state === 'attacking') attackingCount++
    }
    if (attackingCount > ids.length * 0.4) return MigrationReason.WAR

    // Opportunity: very fertile unclaimed land nearby (rare positive trigger)
    if (!civManager.isLandUnclaimed(Math.floor(cx), Math.floor(cy), 15)) {
      // Already claimed, no opportunity trigger
      return null
    }

    return null
  }

  /**
   * Find a suitable destination for a migration wave, preferring fertile
   * unclaimed land away from the origin.
   */
  private findDestination(
    world: World, civManager: CivManager,
    fromX: number, fromY: number, reason: MigrationReason
  ): { x: number; y: number } | null {
    let bestX = -1
    let bestY = -1
    let bestScore = -Infinity

    const minDist = reason === MigrationReason.DISASTER ? 40 : 25
    const maxDist = 80

    for (let attempt = 0; attempt < 25; attempt++) {
      const angle = Math.random() * Math.PI * 2
      const dist = minDist + Math.random() * (maxDist - minDist)
      const tx = Math.floor(fromX + Math.cos(angle) * dist)
      const ty = Math.floor(fromY + Math.sin(angle) * dist)

      if (tx < 5 || tx >= WORLD_WIDTH - 5 || ty < 5 || ty >= WORLD_HEIGHT - 5) continue

      const tile = world.getTile(tx, ty)
      if (tile === null || !isWalkable(tile, false)) continue
      if (tile === TileType.LAVA) continue

      // Score the destination
      let score = 0
      const sr = 8
      for (let dy = -sr; dy <= sr; dy++) {
        for (let dx = -sr; dx <= sr; dx++) {
          const t = world.getTile(tx + dx, ty + dy)
          if (t === TileType.GRASS) score += 1
          if (t === TileType.FOREST) score += 1.5
          if (t === TileType.LAVA) score -= 5
        }
      }

      // Prefer unclaimed land
      if (civManager.isLandUnclaimed(tx, ty, 15)) {
        score += 80
      } else {
        score -= 100
      }

      // Distance bonus (not too close)
      if ((tx - fromX) ** 2 + (ty - fromY) ** 2 > 900) score += 15  // dist > 30

      if (score > bestScore) {
        bestScore = score
        bestX = tx
        bestY = ty
      }
    }

    if (bestX < 0) return null
    return { x: bestX, y: bestY }
  }

  /**
   * Advance all active waves: move creatures, apply snowball effect,
   * and settle or remove completed waves.
   */
  private advanceWaves(em: EntityManager, world: World): void {
    const toRemove = this._wavesToRemoveBuf
    toRemove.length = 0

    for (let i = 0; i < this.activeWaves.length; i++) {
      const wave = this.activeWaves[i]

      // Remove dead entities
      for (const id of wave.entityIds) {
        if (!em.hasComponent(id, 'position')) {
          wave.entityIds.delete(id)
        }
      }

      // Wave dissolved if too few remain
      if (wave.entityIds.size < 2) {
        this.releaseWave(em, wave)
        toRemove.push(i)
        continue
      }

      // Advance progress
      wave.progress = Math.min(1, wave.progress + WorldMigrationWaveSystem.WAVE_SPEED)

      // Interpolated wave center
      const cx = wave.fromX + (wave.toX - wave.fromX) * wave.progress
      const cy = wave.fromY + (wave.toY - wave.fromY) * wave.progress

      // Move entities toward wave center
      for (const id of wave.entityIds) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const ai = em.getComponent<AIComponent>(id, 'ai')
        if (!pos || !ai) continue

        // Keep them migrating toward the interpolated center with scatter
        ai.state = 'migrating'
        ai.targetX = cx + (Math.random() - 0.5) * 4
        ai.targetY = cy + (Math.random() - 0.5) * 4
      }

      // Snowball effect: recruit nearby non-migrating creatures
      if (world.tick % 30 === 0) {
        this.recruitNearby(em, wave, cx, cy)
      }

      // Check completion
      if (wave.progress >= 1) {
        this.settleWave(em, wave, world)
        toRemove.push(i)
      }
    }

    // Remove completed waves in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeWaves.splice(toRemove[i], 1)
    }
  }

  /**
   * Snowball effect: creatures near the wave path are recruited into it.
   */
  private recruitNearby(em: EntityManager, wave: MigrationWave, cx: number, cy: number): void {
    const radius = WorldMigrationWaveSystem.SNOWBALL_RADIUS
    const radiusSq = radius * radius
    const allCreatures = em.getEntitiesWithComponents('position', 'ai', 'creature')

    for (const id of allCreatures) {
      if (wave.entityIds.has(id)) continue

      const ai = em.getComponent<AIComponent>(id, 'ai')
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!ai || !pos) continue
      if (ai.state === 'migrating') continue
      const dx = pos.x - cx
      const dy = pos.y - cy
      if (dx * dx + dy * dy > radiusSq) continue

      if (Math.random() > WorldMigrationWaveSystem.SNOWBALL_CHANCE) continue

      // Recruit
      wave.entityIds.add(id)
      ai.state = 'migrating'
      ai.targetX = wave.toX
      ai.targetY = wave.toY
    }
  }

  /**
   * When a wave reaches its destination, release all creatures back to idle.
   */
  private settleWave(em: EntityManager, wave: MigrationWave, world: World): void {
    for (const id of wave.entityIds) {
      const ai = em.getComponent<AIComponent>(id, 'ai')
      if (ai) {
        ai.state = 'idle'
        ai.cooldown = 0
      }
    }

    EventLog.log(
      'world_event',
      `Migration wave (${REASON_LABELS[wave.reason]}) of ${wave.entityIds.size} creatures arrived at (${wave.toX},${wave.toY})`,
      world.tick
    )
  }

  /** Release creatures from a dissolved wave. */
  private releaseWave(em: EntityManager, wave: MigrationWave): void {
    for (const id of wave.entityIds) {
      const ai = em.getComponent<AIComponent>(id, 'ai')
      if (ai && ai.state === 'migrating') {
        ai.state = 'idle'
        ai.cooldown = 0
      }
    }
  }

  /** Check if a point is near an existing wave's origin to avoid duplicates. */
  private isNearExistingWaveOrigin(x: number, y: number, minDist: number): boolean {
    const minDistSq = minDist * minDist
    for (const wave of this.activeWaves) {
      const dx = wave.fromX - x
      const dy = wave.fromY - y
      if (dx * dx + dy * dy < minDistSq) return true
    }
    return false
  }
}
