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

// Pre-allocated 4-directional offsets to avoid creating arrays in hasAdjacentTileType hot loops
const CARDINAL_OFFSETS: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const

export interface ActiveWeatherDisaster {
  type: WeatherDisasterType
  startTick: number
  duration: number // ticks
  intensity: number // 0.0-1.0
  affectedArea: { x: number; y: number; radius: number } | null // null = global
  originalTiles: Map<number, TileType> // record modified tiles for restoration (key = x * 10000 + y)
}

const DISASTER_NAMES: Record<WeatherDisasterType, string> = {
  blizzard: 'Blizzard',
  drought: 'Drought',
  flood: 'Flood',
  heatwave: 'Heat Wave'
}

// Pre-computed overlay gradient color stops (101 steps, alpha 0.00..1.00)
// Blizzard: rgba(200,220,255, alpha*0.15) and rgba(220,235,255, alpha*0.40)
const _BLIZZARD_STOP1: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(200,220,255,${(i / 100 * 0.15).toFixed(3)})`)
  return c
})()
const _BLIZZARD_STOP2: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(220,235,255,${(i / 100 * 0.40).toFixed(3)})`)
  return c
})()
// Flood: rgba(40,80,140, alpha*0.08) and rgba(30,60,120, alpha*0.20)
const _FLOOD_STOP1: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(40,80,140,${(i / 100 * 0.08).toFixed(3)})`)
  return c
})()
const _FLOOD_STOP2: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(30,60,120,${(i / 100 * 0.20).toFixed(3)})`)
  return c
})()
// Heatwave: rgba(255,100,50, alpha*0.06) and rgba(255,60,20, alpha*0.15)
const _HEATWAVE_STOP1: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(255,100,50,${(i / 100 * 0.06).toFixed(3)})`)
  return c
})()
const _HEATWAVE_STOP2: string[] = (() => {
  const c: string[] = []
  for (let i = 0; i <= 100; i++) c.push(`rgba(255,60,20,${(i / 100 * 0.15).toFixed(3)})`)
  return c
})()

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
        this.expireDisaster(d, world, tick)
        this.activeDisasters.splice(i, 1)
        continue
      }

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
    // Build active type lookup without allocating a new Set
    let hasBlizzard = false, hasDrought = false, hasFlood = false, hasHeatwave = false
    for (const d of this.activeDisasters) {
      if (d.type === 'blizzard') hasBlizzard = true
      else if (d.type === 'drought') hasDrought = true
      else if (d.type === 'flood') hasFlood = true
      else if (d.type === 'heatwave') hasHeatwave = true
    }

    // Blizzard: winter + storm/snow, 5% chance
    if (season === 'winter' && (weather === 'storm' || weather === 'snow')
        && !hasBlizzard && Math.random() < 0.05) {
      this.triggerBlizzard(world, em, particles, tick)
    }

    // Drought: summer + clear, 3% chance
    if (season === 'summer' && weather === 'clear'
        && !hasDrought && Math.random() < 0.03) {
      this.triggerDrought(world, em, particles, tick)
    }

    // Flood: spring + rain/storm, 4% chance
    if (season === 'spring' && (weather === 'rain' || weather === 'storm')
        && !hasFlood && Math.random() < 0.04) {
      this.triggerFlood(world, em, particles, tick)
    }

    // Heatwave: summer + clear, 3% chance
    if (season === 'summer' && weather === 'clear'
        && !hasHeatwave && Math.random() < 0.03) {
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
    const key = x * 10000 + y
    if (!disaster.originalTiles.has(key)) {
      const current = world.getTile(x, y)
      if (current !== null) {
        disaster.originalTiles.set(key, current)
      }
    }
    world.setTile(x, y, newType)
  }

  // --- Trigger handlers ---

  private triggerBlizzard(world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    const disaster = this.createDisaster('blizzard', tick)
    const area = disaster.affectedArea
    if (!area) return

    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        if (tile === TileType.GRASS && Math.random() < chance * 0.6) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        } else if (tile === TileType.FOREST && Math.random() < chance * 0.4) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        } else if (tile === TileType.SHALLOW_WATER && Math.random() < chance * 0.5) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        }
      }
    }

    for (let i = 0; i < 20; i++) {
      const px = area.x + (Math.random() - 0.5) * area.radius * 2
      const py = area.y + (Math.random() - 0.5) * area.radius * 2
      particles.addParticle({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 0.5,
        life: 40 + Math.random() * 30, maxLife: 70,
        color: '#ffffff', size: 1 + Math.random()
      })
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', 'A fierce blizzard strikes the land!', tick)
  }

  private triggerDrought(world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    const disaster = this.createDisaster('drought', tick)
    const area = disaster.affectedArea
    if (!area) return

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
    EventLog.log('disaster', 'A severe drought grips the region!', tick)
  }

  private triggerFlood(world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    const disaster = this.createDisaster('flood', tick)
    const area = disaster.affectedArea
    if (!area) return

    for (let dy = -area.radius; dy <= area.radius; dy++) {
      for (let dx = -area.radius; dx <= area.radius; dx++) {
        const tx = area.x + dx
        const ty = area.y + dy
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
        if (!this.isInArea(tx, ty, area)) continue

        const tile = world.getTile(tx, ty)
        const dist = Math.sqrt(dx * dx + dy * dy) / area.radius
        const chance = (1 - dist) * disaster.intensity

        if (tile === TileType.GRASS && Math.random() < chance * 0.3) {
          const hasWater = this.hasAdjacentTileType(world, tx, ty, TileType.SHALLOW_WATER)
            || this.hasAdjacentTileType(world, tx, ty, TileType.DEEP_WATER)
          if (hasWater || Math.random() < 0.1) {
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
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      if (!this.isInArea(pos.x, pos.y, area)) continue
      const building = em.getComponent<BuildingComponent>(id, 'building')
      if (!building) continue
      if (building.level <= 1) {
        building.health -= Math.floor(20 * disaster.intensity)
      }
    }

    for (let i = 0; i < 15; i++) {
      const px = area.x + (Math.random() - 0.5) * area.radius * 2
      const py = area.y + (Math.random() - 0.5) * area.radius * 2
      particles.addParticle({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 30 + Math.random() * 20, maxLife: 50,
        color: '#8B7355', size: 1 + Math.random() * 0.5
      })
    }

    this.activeDisasters.push(disaster)
    EventLog.log('disaster', 'Flooding! Rivers overflow their banks!', tick)
  }

  private triggerHeatwave(world: World, em: EntityManager, particles: ParticleSystem, tick: number): void {
    const disaster = this.createDisaster('heatwave', tick)
    const area = disaster.affectedArea
    if (!area) return

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
    EventLog.log('disaster', 'An extreme heat wave scorches the land!', tick)
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
    const elapsed = tick - disaster.startTick
    switch (disaster.type) {
      case 'blizzard':
        this.applyBlizzardEffects(disaster, world, em, particles, tick, elapsed)
        break
      case 'drought':
        this.applyDroughtEffects(disaster, world, em, particles, tick, elapsed)
        break
      case 'flood':
        this.applyFloodEffects(disaster, world, em, civManager, particles, tick, elapsed)
        break
      case 'heatwave':
        this.applyHeatwaveEffects(disaster, world, em, particles, tick, elapsed)
        break
    }
  }

  private applyBlizzardEffects(
    disaster: ActiveWeatherDisaster, world: World, em: EntityManager,
    particles: ParticleSystem, tick: number, elapsed: number
  ): void {
    const area = disaster.affectedArea

    // Slow creatures 50% and increase hunger 30% every 60 ticks
    if (elapsed % 60 === 0) {
      const entities = em.getEntitiesWithComponents('position', 'needs', 'creature')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        const needs = em.getComponent<NeedsComponent>(id, 'needs')
        if (!pos || !creature || !needs) continue
        if (!this.isInArea(pos.x, pos.y, area)) continue

        // Gradual speed reduction (approaches 50% over time)
        creature.speed = Math.max(0.1, creature.speed * 0.98)
        // Hunger increases 30% faster
        needs.hunger = Math.min(100, needs.hunger + 0.4 * disaster.intensity)
        // Cold damage (dragons immune)
        if (creature.species !== 'dragon') {
          needs.health -= 0.3 * disaster.intensity
        }
      }
    }

    // Snow particles (capped at ~30 active per disaster)
    if (elapsed % 4 === 0 && area) {
      const count = Math.min(6, Math.floor(disaster.intensity * 8))
      for (let i = 0; i < count; i++) {
        const px = area.x + (Math.random() - 0.5) * area.radius * 2
        const py = area.y + (Math.random() - 0.5) * area.radius * 2
        particles.addParticle({
          x: px, y: py - 5,
          vx: (Math.random() - 0.5) * 1.5 + Math.sin(tick * 0.02) * 0.5,
          vy: 0.3 + Math.random() * 0.5,
          life: 30 + Math.random() * 25, maxLife: 55,
          color: Math.random() < 0.7 ? '#ffffff' : '#ddeeff',
          size: 0.6 + Math.random() * 0.8
        })
      }
    }

    // Gradually freeze more tiles
    if (elapsed % 180 === 0 && area) {
      const tx = area.x + Math.floor((Math.random() - 0.5) * area.radius * 2)
      const ty = area.y + Math.floor((Math.random() - 0.5) * area.radius * 2)
      if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT && this.isInArea(tx, ty, area)) {
        const tile = world.getTile(tx, ty)
        if (tile === TileType.GRASS || tile === TileType.SHALLOW_WATER) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SNOW)
        }
      }
    }
  }

  private applyDroughtEffects(
    disaster: ActiveWeatherDisaster, world: World, em: EntityManager,
    particles: ParticleSystem, tick: number, elapsed: number
  ): void {
    const area = disaster.affectedArea

    // Crop yield halved = more hunger
    if (elapsed % 60 === 0) {
      const entities = em.getEntitiesWithComponents('position', 'needs', 'creature')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const needs = em.getComponent<NeedsComponent>(id, 'needs')
        if (!pos || !needs) continue
        if (!this.isInArea(pos.x, pos.y, area)) continue
        needs.hunger = Math.min(100, needs.hunger + 0.3 * disaster.intensity)
      }
    }

    // Gradually dry out more tiles
    if (elapsed % 240 === 0 && area) {
      const tx = area.x + Math.floor((Math.random() - 0.5) * area.radius * 2)
      const ty = area.y + Math.floor((Math.random() - 0.5) * area.radius * 2)
      if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT && this.isInArea(tx, ty, area)) {
        const tile = world.getTile(tx, ty)
        if (tile === TileType.SHALLOW_WATER && Math.random() < 0.3) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SAND)
        } else if (tile === TileType.FOREST && Math.random() < 0.2) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.GRASS)
        }
      }
    }

    // Spontaneous fire on forest tiles
    if (elapsed % 300 === 0 && area) {
      const tx = area.x + Math.floor((Math.random() - 0.5) * area.radius * 2)
      const ty = area.y + Math.floor((Math.random() - 0.5) * area.radius * 2)
      if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT && this.isInArea(tx, ty, area)) {
        const tile = world.getTile(tx, ty)
        if (tile === TileType.FOREST && Math.random() < 0.15 * disaster.intensity) {
          this.setTileWithRecord(world, disaster, tx, ty, TileType.SAND)
          particles.spawnExplosion(tx, ty)
          EventLog.log('disaster', 'Drought sparks a wildfire!', tick)
        }
      }
    }

    // Heat shimmer particles
    if (elapsed % 8 === 0 && area) {
      const count = Math.min(4, Math.floor(disaster.intensity * 5))
      for (let i = 0; i < count; i++) {
        const px = area.x + (Math.random() - 0.5) * area.radius * 2
        const py = area.y + (Math.random() - 0.5) * area.radius * 2
        particles.addParticle({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.2 - Math.random() * 0.3,
          life: 20 + Math.random() * 15, maxLife: 35,
          color: Math.random() < 0.5 ? '#cc9944' : '#aa7733',
          size: 0.5 + Math.random() * 0.4
        })
      }
    }

    if (elapsed % 600 === 0 && elapsed > 0) {
      EventLog.log('disaster', 'The drought continues... the land cracks and withers.', tick)
    }
  }

  private applyFloodEffects(
    disaster: ActiveWeatherDisaster, world: World, em: EntityManager,
    civManager: CivManager, particles: ParticleSystem, tick: number, elapsed: number
  ): void {
    const area = disaster.affectedArea

    // Damage creatures standing in floodwater
    if (elapsed % 60 === 0) {
      const entities = em.getEntitiesWithComponents('position', 'needs', 'creature')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (!pos) continue
        if (!this.isInArea(pos.x, pos.y, area)) continue
        const tile = world.getTile(Math.floor(pos.x), Math.floor(pos.y))
        if (tile === TileType.SHALLOW_WATER) {
          const needs = em.getComponent<NeedsComponent>(id, 'needs')
          const creature = em.getComponent<CreatureComponent>(id, 'creature')
          if (!needs || !creature) continue
          creature.speed = Math.max(0.1, creature.speed * 0.97)
          needs.health -= 0.2 * disaster.intensity
        }
      }
    }

    // Water continues to spread
    if (elapsed % 200 === 0 && area) {
      const tx = area.x + Math.floor((Math.random() - 0.5) * area.radius * 2)
      const ty = area.y + Math.floor((Math.random() - 0.5) * area.radius * 2)
      if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT && this.isInArea(tx, ty, area)) {
        const tile = world.getTile(tx, ty)
        if (tile === TileType.GRASS && this.hasAdjacentTileType(world, tx, ty, TileType.SHALLOW_WATER)) {
          if (Math.random() < 0.25 * disaster.intensity) {
            this.setTileWithRecord(world, disaster, tx, ty, TileType.SHALLOW_WATER)
          }
        }
      }
    }

    // Ongoing building damage
    if (elapsed % 300 === 0) {
      const buildingEntities = em.getEntitiesWithComponents('position', 'building')
      for (const id of buildingEntities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const building = em.getComponent<BuildingComponent>(id, 'building')
        if (!pos || !building) continue
        if (!this.isInArea(pos.x, pos.y, area)) continue
        if (building.level <= 1) {
          building.health -= Math.floor(10 * disaster.intensity)
        }
      }
    }

    // Muddy water particles
    if (elapsed % 6 === 0 && area) {
      const count = Math.min(5, Math.floor(disaster.intensity * 6))
      for (let i = 0; i < count; i++) {
        const px = area.x + (Math.random() - 0.5) * area.radius * 2
        const py = area.y + (Math.random() - 0.5) * area.radius * 2
        particles.addParticle({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          life: 25 + Math.random() * 15, maxLife: 40,
          color: Math.random() < 0.6 ? '#6688aa' : '#8B7355',
          size: 0.6 + Math.random() * 0.5
        })
      }
    }
  }

  private applyHeatwaveEffects(
    disaster: ActiveWeatherDisaster, world: World, em: EntityManager,
    particles: ParticleSystem, tick: number, elapsed: number
  ): void {
    const area = disaster.affectedArea

    // Double stamina consumption
    if (elapsed % 60 === 0) {
      const entities = em.getEntitiesWithComponents('position', 'needs', 'creature')
      for (const id of entities) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        const needs = em.getComponent<NeedsComponent>(id, 'needs')
        if (!pos || !creature || !needs) continue
        if (!this.isInArea(pos.x, pos.y, area)) continue
        if (creature.species !== 'dragon') {
          needs.health -= 0.4 * disaster.intensity
          needs.hunger = Math.min(100, needs.hunger + 0.3 * disaster.intensity)
        }
      }
    }

    // Sand expansion
    if (elapsed % 300 === 0 && area) {
      const tx = area.x + Math.floor((Math.random() - 0.5) * area.radius * 2)
      const ty = area.y + Math.floor((Math.random() - 0.5) * area.radius * 2)
      if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT && this.isInArea(tx, ty, area)) {
        const tile = world.getTile(tx, ty)
        if (tile === TileType.GRASS && this.hasAdjacentTileType(world, tx, ty, TileType.SAND)) {
          if (Math.random() < 0.2 * disaster.intensity) {
            this.setTileWithRecord(world, disaster, tx, ty, TileType.SAND)
          }
        }
      }
    }

    // Rising heat particles
    if (elapsed % 10 === 0 && area) {
      const count = Math.min(3, Math.floor(disaster.intensity * 4))
      for (let i = 0; i < count; i++) {
        const px = area.x + (Math.random() - 0.5) * area.radius * 2
        const py = area.y + (Math.random() - 0.5) * area.radius * 2
        particles.addParticle({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.3 - Math.random() * 0.3,
          life: 20 + Math.random() * 15, maxLife: 35,
          color: Math.random() < 0.5 ? '#ff6633' : '#ff4411',
          size: 0.5 + Math.random() * 0.4
        })
      }
    }
  }

  // --- Disaster expiration ---

  private expireDisaster(disaster: ActiveWeatherDisaster, world: World, tick: number): void {
    for (const [key, originalType] of disaster.originalTiles) {
      const x = Math.floor(key / 10000)
      const y = key % 10000
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        world.setTile(x, y, originalType)
      }
    }
    disaster.originalTiles.clear()
    EventLog.log('disaster', `The ${DISASTER_NAMES[disaster.type]} has ended.`, tick)
  }

  // --- Render overlays ---

  private renderBlizzardOverlay(
    ctx: CanvasRenderingContext2D, width: number, height: number, tick: number, alpha: number
  ): void {
    // White vignette frost on screen edges
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.min(width, height) * 0.7
    )
    gradient.addColorStop(0, 'rgba(200, 220, 255, 0)')
    gradient.addColorStop(0.7, _BLIZZARD_STOP1[Math.min(100, Math.round(alpha * 100))])
    gradient.addColorStop(1, _BLIZZARD_STOP2[Math.min(100, Math.round(alpha * 100))])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Frost crystal streaks on corners
    ctx.save()
    ctx.globalAlpha = alpha * 0.3
    ctx.strokeStyle = '#ccddff'
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
    ctx.restore()
  }

  private renderDroughtOverlay(
    ctx: CanvasRenderingContext2D, width: number, height: number, tick: number, alpha: number
  ): void {
    // Yellow-brown sepia tint
    ctx.save()
    ctx.globalAlpha = alpha * 0.1
    ctx.fillStyle = '#b48c3c'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // Heat wave distortion (sin wave horizontal lines)
    ctx.save()
    ctx.globalAlpha = alpha * 0.06
    ctx.strokeStyle = '#ffcc66'
    ctx.lineWidth = 1
    const waveCount = 8
    for (let i = 0; i < waveCount; i++) {
      const baseY = (height / waveCount) * i + Math.sin(tick * 0.03 + i) * 3
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      for (let x = 0; x < width; x += 10) {
        const offsetY = Math.sin((x + tick * 2) * 0.02 + i * 0.5) * 2
        ctx.lineTo(x, baseY + offsetY)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  private renderFloodOverlay(
    ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number
  ): void {
    // Blue gradient from bottom
    const gradient = ctx.createLinearGradient(0, height * 0.6, 0, height)
    gradient.addColorStop(0, 'rgba(40, 80, 140, 0)')
    gradient.addColorStop(0.5, _FLOOD_STOP1[Math.min(100, Math.round(alpha * 100))])
    gradient.addColorStop(1, _FLOOD_STOP2[Math.min(100, Math.round(alpha * 100))])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  private renderHeatwaveOverlay(
    ctx: CanvasRenderingContext2D, width: number, height: number, tick: number, alpha: number
  ): void {
    // Orange-red edge vignette
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.min(width, height) * 0.7
    )
    gradient.addColorStop(0, 'rgba(255, 100, 50, 0)')
    gradient.addColorStop(0.8, _HEATWAVE_STOP1[Math.min(100, Math.round(alpha * 100))])
    gradient.addColorStop(1, _HEATWAVE_STOP2[Math.min(100, Math.round(alpha * 100))])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Wavy heat distortion lines
    ctx.save()
    ctx.globalAlpha = alpha * 0.05
    ctx.strokeStyle = '#ff8844'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 6; i++) {
      const baseY = height * 0.2 + (height * 0.6 / 6) * i
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      for (let x = 0; x < width; x += 8) {
        const wave = Math.sin((x + tick * 3) * 0.025 + i * 0.7) * 3
        ctx.lineTo(x, baseY + wave)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  // --- Utility ---

  private hasAdjacentTileType(world: World, x: number, y: number, tileType: TileType): boolean {
    for (const [ox, oy] of CARDINAL_OFFSETS) {
      if (world.getTile(x + ox, y + oy) === tileType) return true
    }
    return false
  }
}
