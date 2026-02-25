// Weather Disaster System - Links weather events to world-altering disasters
// Blizzards, droughts, floods, and heatwaves that reshape terrain and affect creatures

import { World } from '../game/World'
import { EntityManager, CreatureComponent, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'
import { BuildingComponent } from '../civilization/Civilization'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

export type WeatherDisasterType = 'blizzard' | 'drought' | 'flood' | 'heatwave'

export interface ActiveWeatherDisaster {
  type: WeatherDisasterType
  startTick: number
  duration: number // ticks
  intensity: number // 0.0-1.0
  affectedArea: { x: number; y: number; radius: number } | null // null = global
  originalTiles: Map<string, TileType> // record modified tiles for restoration
}

const DISASTER_NAMES: Record<WeatherDisasterType, string> = {
  blizzard: 'Blizzard',
  drought: 'Drought',
  flood: 'Flood',
  heatwave: 'Heat Wave'
}

export class WeatherDisasterSystem {
  private activeDisasters: ActiveWeatherDisaster[] = []
  private lastCheckTick: number = 0

  update(
    world: World,
    em: EntityManager,
    civManager: CivManager,
    particles: ParticleSystem,
    tick: number,
    season: 'spring' | 'summer' | 'autumn' | 'winter',
    weather: 'clear' | 'rain' | 'storm' | 'snow'
  ): void {
    // Check for new disasters every 120 ticks
    if (tick - this.lastCheckTick >= 120) {
      this.lastCheckTick = tick
      this.checkTriggers(world, em, particles, tick, season, weather)
    }

    // Update active disasters
    for (let i = this.activeDisasters.length - 1; i >= 0; i--) {
      const d = this.activeDisasters[i]
      const elapsed = tick - d.startTick

      if (elapsed >= d.duration) {
        // Disaster expired - restore terrain
        this.expireDisaster(d, world, tick)
        this.activeDisasters.splice(i, 1)
        continue
      }

      // Apply ongoing effects
      this.applyOngoingEffects(d, world, em, civManager, particles, tick)
    }
  }

  getActiveDisasters(): ActiveWeatherDisaster[] {
    return this.activeDisasters
  }

  renderOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tick: number
  ): void {
    for (const d of this.activeDisasters) {
      const elapsed = tick - d.startTick
      // Fade in over first 60 ticks, fade out over last 60 ticks
      const fadeIn = Math.min(1, elapsed / 60)
      const fadeOut = Math.min(1, (d.duration - elapsed) / 60)
      const alpha = fadeIn * fadeOut * d.intensity

      switch (d.type) {
        case 'blizzard':
          this.renderBlizzardOverlay(ctx, width, height, tick, alpha)
          break
        case 'drought':
          this.renderDroughtOverlay(ctx, width, height, tick, alpha)
          break
        case 'flood':
          this.renderFloodOverlay(ctx, width, height, alpha)
          break
        case 'heatwave':
          this.renderHeatwaveOverlay(ctx, width, height, tick, alpha)
          break
      }
    }
  }

  // --- Trigger logic ---

  private checkTriggers(
    world: World,
    em: EntityManager,
    particles: ParticleSystem,
    tick: number,
    season: 'spring' | 'summer' | 'autumn' | 'winter',
    weather: 'clear' | 'rain' | 'storm' | 'snow'
  ): void {
    // Don't stack same disaster type
    const activeTypes = new Set(this.activeDisasters.map(d => d.type))

    // Blizzard: winter + storm/snow, 5% chance
    if (season === 'winter' && (weather === 'storm' || weather === 'snow')
        && !activeTypes.has('blizzard') && Math.random() < 0.05) {
      this.triggerBlizzard(world, em, particles, tick)
    }

    // Drought: summer + clear, 3% chance
    if (season === 'summer' && weather === 'clear'
        && !activeTypes.has('drought') && Math.random() < 0.03) {
      this.triggerDrought(world, em, particles, tick)
    }

    // Flood: spring + rain/storm, 4% chance
    if (season === 'spring' && (weather === 'rain' || weather === 'storm')
        && !activeTypes.has('flood') && Math.random() < 0.04) {
      this.triggerFlood(world, em, particles, tick)
    }

    // Heatwave: summer + clear, 3% chance
    if (season === 'summer' && weather === 'clear'
        && !activeTypes.has('heatwave') && Math.random() < 0.03) {
      this.triggerHeatwave(world, em, particles, tick)
    }
  }

  private createDisaster(
    type: WeatherDisasterType,
    tick: number,
    areaCenter?: { x: number; y: number }
  ): ActiveWeatherDisaster {
    const radius = 20 + Math.floor(Math.random() * 21) // 20-40
    const duration = 600 + Math.floor(Math.random() * 1201) // 600-1800
    const intensity = 0.5 + Math.random() * 0.5 // 0.5-1.0

    return {
      type,
      startTick: tick,
      duration,
      intensity,
      affectedArea: areaCenter
        ? { x: areaCenter.x, y: areaCenter.y, radius }
        : { x: Math.floor(Math.random() * WORLD_WIDTH), y: Math.floor(Math.random() * WORLD_HEIGHT), radius },
      originalTiles: new Map()
    }
  }

  private isInArea(x: number, y: number, area: { x: number; y: number; radius: number } | null): boolean {
    if (!area) return true
    const dx = x - area.x
    const dy = y - area.y
    return dx * dx + dy * dy <= area.radius * area.radius
  }

  private setTileWithRecord(
    world: World,
    disaster: ActiveWeatherDisaster,
    x: number,
    y: number,
    newType: TileType
  ): void {
    const key = `${x},${y}`
    // Only record the first original value per tile
    if (!disaster.originalTiles.has(key)) {
      const current = world.getTile(x, y)
      if (current !== null) {
        disaster.originalTiles.set(key, current)
      }
    }
    world.setTile(x, y, newType)
  }

  // --- Trigger handlers ---

  private triggerBlizzard(
    world: World,
    em: EntityManager,
    particles: ParticleSystem,
    tick: number
  ): void {
    const disaster = this.createDisaster('blizzard', tick)
    const area = disaster.affectedArea!

    // Convert grass/forest to snow, freeze shallow water
    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        // Higher chance near center
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        if (tile === TileType.GRASS && Math.random() < chance * 0.6) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        } else if (tile === TileType.FOREST && Math.random() < chance * 0.4) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        } else if (tile === TileType.SHALLOW_WATER && Math.random() < chance * 0.5) {
          // Freeze water - use SNOW to represent ice
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        }
      }
    }

    // Initial burst of snow particles
    for (let i = 0; i < 20; i++) {
      const px = area.x + (Math.random() - 0.5) * area.radius * 2
      const py = area.y + (Math.random() - 0.5) * area.radius * 2
      particles.addParticle({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 0.5,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: '#ffffff',
        size: 1 + Math.random()
      })
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', `A fierce blizzard strikes the land!`, tick)
  }

  private triggerDrought(
    world: World,
    em: EntityManager,
    particles: ParticleSystem,
    tick: number
  ): void {
    const disaster = this.createDisaster('drought', tick)
    const area = disaster.affectedArea!

    // Shrink water, wither forests
    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        if (tile === TileType.SHALLOW_WATER && Math.random() < chance * 0.3) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SAND)
        } else if (tile === TileType.FOREST && Math.random() < chance * 0.25) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.GRASS)
        }
      }
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', `A severe drought grips the region!`, tick)
  }

  private triggerFlood(
    world: World,
    em: EntityManager,
    particles: ParticleSystem,
    tick: number
  ): void {
    const disaster = this.createDisaster('flood', tick)
    const area = disaster.affectedArea!

    // Expand water into low-lying grass
    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        // Grass near water becomes shallow water
        if (tile === TileType.GRASS && Math.random() < chance * 0.3) {
          // Check if adjacent to water
          const hasAdjacentWater = this.hasAdjacentTileType(world, tx, ty, TileType.SHALLOW_WATER)
            || this.hasAdjacentTileType(world, tx, ty, TileType.DEEP_WATER)
          if (hasAdjacentWater || Math.random() < 0.1) {
            this.setTileWithRecord(world, disaster, tx, ty, TileType.SHALLOW_WATER)
          }
        } else if (tile === TileType.SAND && Math.random() < chance * 0.2) {
          if (this.hasAdjacentTileType(world, tx, ty, TileType.SHALLOW_WATER)) {
            this.setTileWithRecord(world, disaster, tx, ty, TileType.SHALLOW_WATER)
          }
        }
      }
    }

    // Damage low-level buildings in flood area
    const buildingEntities = em.getEntitiesWithComponents('position', 'building')
    for (const id of buildingEntities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')!
      if (!this.isInArea(pos.x, pos.y, area)) continue
      const building = em.getComponent<BuildingComponent>(id, 'building')!
      if (building.level <= 1) {
        building.health -= Math.floor(20 * disaster.intensity)
      }
    }

    // Muddy water particles
    for (let i = 0; i < 15; i++) {
      const px = area.x + (Math.random() - 0.5) * area.radius * 2
      const py = area.y + (Math.random() - 0.5) * area.radius * 2
      particles.addParticle({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: '#8B7355',
        size: 1 + Math.random() * 0.5
      })
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', `Flooding! Rivers overflow their banks!`, tick)
  }

  private triggerHeatwave(
    world: World,
    em: EntityManager,
    particles: ParticleSystem,
    tick: number
  ): void {
    const disaster = this.createDisaster('heatwave', tick)
    const area = disaster.affectedArea!

    // Sand expands into grass
    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        if (tile === TileType.GRASS && Math.random() < chance * 0.2) {
          if (this.hasAdjacentTileType(world, tx, ty, TileType.SAND)) {
            this.setTileWithRecord(world, disaster, tx, ty, TileType.SAND)
          }
        }
      }
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', `An extreme heat wave scorches the land!`, tick)
  }

  // --- Ongoing effects ---

  private applyOngoingEffects(
    disaster: ActiveWeatherDisaster,
    world: World,
    em: EntityManager,
    civManager: CivManager,
    particles: ParticleSystem,
    tick: number
  ): void {
    // Apply effects every 30 ticks
    if (tick % 30 !== 0) return

    const area = disaster.affectedArea
    const creatureEntities = em.getEntitiesWithComponents('position', 'creature', 'needs')

    for (const id of creatureEntities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')!
      if (!this.isInArea(pos.x, pos.y, area)) continue

      const needs = em.getComponent<NeedsComponent>(id, 'needs')!

      switch (disaster.type) {
        case 'blizzard':
          // Cold damage, increased hunger
          needs.hunger = Math.max(0, needs.hunger - 3 * disaster.intensity)
          needs.health = Math.max(0, needs.health - 1 * disaster.intensity)
          break
        case 'drought':
          // Thirst and hunger
          needs.hunger = Math.max(0, needs.hunger - 2 * disaster.intensity)
          break
        case 'flood':
          // Slow movement, minor health damage
          needs.health = Math.max(0, needs.health - 1.5 * disaster.intensity)
          break
        case 'heatwave':
          // Exhaustion
          needs.hunger = Math.max(0, needs.hunger - 2.5 * disaster.intensity)
          needs.health = Math.max(0, needs.health - 0.5 * disaster.intensity)
          break
      }
    }

    // Ongoing particles
    if (area) {
      const count = Math.floor(3 * disaster.intensity)
      for (let i = 0; i < count; i++) {
        const px = area.x + (Math.random() - 0.5) * area.radius * 2
        const py = area.y + (Math.random() - 0.5) * area.radius * 2

        switch (disaster.type) {
          case 'blizzard':
            particles.addParticle({
              x: px, y: py, vx: -1 + Math.random() * 0.5, vy: 0.3 + Math.random() * 0.3,
              life: 30, maxLife: 30, color: '#e8e8ff', size: 1
            })
            break
          case 'drought':
            particles.addParticle({
              x: px, y: py, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3,
              life: 25, maxLife: 25, color: '#d4a04088', size: 1.5
            })
            break
          case 'flood':
            particles.addParticle({
              x: px, y: py, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
              life: 20, maxLife: 20, color: '#5588aa88', size: 1.2
            })
            break
          case 'heatwave':
            particles.addParticle({
              x: px, y: py, vx: (Math.random() - 0.5) * 0.2, vy: -0.4 - Math.random() * 0.3,
              life: 20, maxLife: 20, color: '#ff660044', size: 2
            })
            break
        }
      }
    }
  }

  private expireDisaster(disaster: ActiveWeatherDisaster, world: World, tick: number): void {
    // Restore original tiles
    for (const [key, tileType] of disaster.originalTiles) {
      const [xs, ys] = key.split(',')
      const x = parseInt(xs)
      const y = parseInt(ys)
      // Partial restoration — some changes persist
      if (Math.random() < 0.7) {
        world.setTile(x, y, tileType)
      }
    }
    EventLog.log('disaster', `The ${DISASTER_NAMES[disaster.type]} has subsided.`, tick)
  }

  // --- Render overlays ---

  private renderBlizzardOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tick: number,
    alpha: number
  ): void {
    // White-blue tint
    ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.15})`
    ctx.fillRect(0, 0, width, height)

    // Animated snow streaks
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
    ctx.lineWidth = 1
    const streakCount = Math.floor(30 * alpha)
    for (let i = 0; i < streakCount; i++) {
      const x = ((tick * 3 + i * 37) % (width + 100)) - 50
      const y = ((tick * 2 + i * 53) % (height + 100)) - 50
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 8, y + 12)
      ctx.stroke()
    }
  }

  private renderDroughtOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tick: number,
    alpha: number
  ): void {
    // Warm yellow-brown tint
    ctx.fillStyle = `rgba(180, 140, 60, ${alpha * 0.1})`
    ctx.fillRect(0, 0, width, height)

    // Heat shimmer effect
    const shimmer = Math.sin(tick * 0.05) * 0.03
    ctx.fillStyle = `rgba(255, 200, 50, ${(alpha * 0.05) + shimmer})`
    ctx.fillRect(0, 0, width, height)
  }

  private renderFloodOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    alpha: number
  ): void {
    // Blue water tint
    ctx.fillStyle = `rgba(60, 100, 180, ${alpha * 0.12})`
    ctx.fillRect(0, 0, width, height)
  }

  private renderHeatwaveOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tick: number,
    alpha: number
  ): void {
    // Red-orange heat tint
    ctx.fillStyle = `rgba(255, 100, 30, ${alpha * 0.08})`
    ctx.fillRect(0, 0, width, height)

    // Pulsing heat effect
    const pulse = (Math.sin(tick * 0.08) + 1) * 0.5
    ctx.fillStyle = `rgba(255, 50, 0, ${alpha * 0.04 * pulse})`
    ctx.fillRect(0, 0, width, height)
  }

  // --- Helpers ---

  private hasAdjacentTileType(world: World, x: number, y: number, type: TileType): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
        if (world.getTile(nx, ny) === type) return true
      }
    }
    return false
  }
}
