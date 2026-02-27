/**
 * AnimalMigrationSystem - Animals migrate based on seasons, food availability, and threats
 * v1.24
 */

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { Season } from './SeasonSystem'

export interface MigrationRoute {
  species: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  season: Season        // when migration triggers
  progress: number      // 0-1
  entityIds: number[]   // entities in this flock
}

export interface MigrationHotspot {
  x: number
  y: number
  attractiveness: number  // food/safety score
  season: Season
}

export class AnimalMigrationSystem {
  private routes: MigrationRoute[] = []
  private hotspots: MigrationHotspot[] = []
  private lastSeason: Season = Season.Spring
  private migrationCooldown: number = 0
  private _animalsBuf: { id: number; x: number; y: number; species: string }[] = []

  private static UPDATE_INTERVAL = 120  // check every 2 seconds
  private static MAX_ROUTES = 20
  private static FLOCK_RADIUS = 8
  private static MIGRATION_SPEED = 0.005

  /**
   * Scan the world for good migration destinations based on season
   */
  private computeHotspots(world: World, season: Season): void {
    this.hotspots = []
    const w = world.width
    const h = world.height
    const gridSize = 20  // sample every 20 tiles

    for (let gy = 0; gy < h; gy += gridSize) {
      for (let gx = 0; gx < w; gx += gridSize) {
        let score = 0
        // Count favorable tiles in this region
        for (let dy = 0; dy < gridSize && gy + dy < h; dy++) {
          for (let dx = 0; dx < gridSize && gx + dx < w; dx++) {
            const tile = world.getTile(gx + dx, gy + dy)
            // Grass and forest are good for animals
            if (tile === 3 || tile === 4) score += 1  // GRASS, FOREST
            // Water nearby is good
            if (tile === 1 || tile === 2) score += 0.3  // SHALLOW_WATER, DEEP_WATER
          }
        }

        // Season modifiers
        if (season === Season.Winter) {
          // Prefer southern (higher y) regions in winter
          score *= 1 + (gy / h) * 0.5
        } else if (season === Season.Summer) {
          // Prefer northern (lower y) regions in summer
          score *= 1 + (1 - gy / h) * 0.3
        }

        if (score > 5) {
          this.hotspots.push({
            x: gx + gridSize / 2,
            y: gy + gridSize / 2,
            attractiveness: score,
            season,
          })
        }
      }
    }

    // Sort by attractiveness, keep top spots
    this.hotspots.sort((a, b) => b.attractiveness - a.attractiveness)
    this.hotspots = this.hotspots.slice(0, 30)
  }

  /**
   * Find animal entities that should migrate and create routes
   */
  private createMigrationRoutes(em: EntityManager): void {
    if (this.routes.length >= AnimalMigrationSystem.MAX_ROUTES) return
    if (this.hotspots.length === 0) return

    // Find animal clusters (non-civilized creatures)
    const animals = this._animalsBuf
    animals.length = 0
    for (const id of em.getEntitiesWithComponent('position')) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      const creature = em.getComponent<CreatureComponent>(id, 'creature')
      if (!pos || !creature || creature.isHostile === undefined) continue
      animals.push({ id, x: pos.x, y: pos.y, species: creature.species })
    }

    // Group nearby animals of same species into flocks
    const used = new Set<number>()
    for (const animal of animals) {
      if (used.has(animal.id)) continue

      const flock = [animal.id]
      used.add(animal.id)

      for (const other of animals) {
        if (used.has(other.id) || other.species !== animal.species) continue
        const dx = other.x - animal.x
        const dy = other.y - animal.y
        if (dx * dx + dy * dy < AnimalMigrationSystem.FLOCK_RADIUS * AnimalMigrationSystem.FLOCK_RADIUS) {
          flock.push(other.id)
          used.add(other.id)
          if (flock.length >= 8) break
        }
      }

      if (flock.length < 2) continue  // solo animals don't migrate

      // Pick best hotspot that's far enough away
      const bestHotspot = this.hotspots.find(h => {
        const dx = h.x - animal.x
        const dy = h.y - animal.y
        return dx * dx + dy * dy > 400  // at least 20 tiles away
      })

      if (bestHotspot) {
        this.routes.push({
          species: animal.species,
          fromX: animal.x,
          fromY: animal.y,
          toX: bestHotspot.x,
          toY: bestHotspot.y,
          season: this.lastSeason,
          progress: 0,
          entityIds: flock,
        })
      }

      if (this.routes.length >= AnimalMigrationSystem.MAX_ROUTES) break
    }
  }

  /**
   * Move migrating animals along their routes
   */
  private advanceRoutes(em: EntityManager): void {
    for (let i = this.routes.length - 1; i >= 0; i--) {
      const route = this.routes[i]
      route.progress = Math.min(1, route.progress + AnimalMigrationSystem.MIGRATION_SPEED)

      // Interpolate position
      const cx = route.fromX + (route.toX - route.fromX) * route.progress
      const cy = route.fromY + (route.toY - route.fromY) * route.progress

      // Move entities toward the interpolated center
      for (const eid of route.entityIds) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        // Nudge toward route center with some scatter
        const scatter = 3
        pos.x += (cx + (Math.random() - 0.5) * scatter - pos.x) * 0.05
        pos.y += (cy + (Math.random() - 0.5) * scatter - pos.y) * 0.05
      }

      if (route.progress >= 1) {
        this.routes.splice(i, 1)
      }
    }
  }

  getActiveRoutes(): ReadonlyArray<MigrationRoute> {
    return this.routes
  }

  update(tick: number, em: EntityManager, world: World, currentSeason: Season): void {
    if (tick % AnimalMigrationSystem.UPDATE_INTERVAL !== 0) return

    // Season changed — recompute hotspots and trigger new migrations
    if (currentSeason !== this.lastSeason) {
      this.lastSeason = currentSeason
      this.migrationCooldown = 0
      this.computeHotspots(world, currentSeason)
    }

    // Create new routes periodically
    if (this.migrationCooldown <= 0) {
      this.createMigrationRoutes(em)
      this.migrationCooldown = 600  // wait before creating more
    } else {
      this.migrationCooldown--
    }

    // Advance existing routes
    this.advanceRoutes(em)
  }

  serialize(): object {
    return {
      routes: this.routes,
      lastSeason: this.lastSeason,
    }
  }

  deserialize(data: any): void {
    if (!data) return
    this.routes = data.routes ?? []
    this.lastSeason = data.lastSeason ?? Season.Spring
  }
}
