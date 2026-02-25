// World Fog Bank System (v3.55) - Dense fog banks form along coastlines
// Fog reduces visibility, slows creature movement, and can hide dangers

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type FogDensity = 'light' | 'moderate' | 'thick' | 'impenetrable'

export interface FogBank {
  id: number
  x: number
  y: number
  density: FogDensity
  radius: number       // area of effect
  visibility: number   // 0-100 (100 = clear)
  speedPenalty: number  // movement slow factor
  duration: number
  startTick: number
}

const CHECK_INTERVAL = 1100
const FOG_CHANCE = 0.005
const MAX_FOGS = 10
const DISSIPATE_RATE = 0.04

const VISIBILITY_MAP: Record<FogDensity, number> = {
  light: 70,
  moderate: 45,
  thick: 20,
  impenetrable: 5,
}

const SPEED_MAP: Record<FogDensity, number> = {
  light: 0.9,
  moderate: 0.7,
  thick: 0.5,
  impenetrable: 0.25,
}

const DENSITIES: FogDensity[] = ['light', 'moderate', 'thick', 'impenetrable']

export class WorldFogBankSystem {
  private fogs: FogBank[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn fog near water/land boundaries
    if (this.fogs.length < MAX_FOGS && Math.random() < FOG_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Fog forms on land tiles adjacent to water
      if (tile === TileType.GRASS || tile === TileType.SAND || tile === TileType.FOREST) {
        const hasWaterNeighbor = this.checkWaterNeighbor(world, x, y, w, h)
        if (hasWaterNeighbor) {
          const density = DENSITIES[Math.floor(Math.random() * DENSITIES.length)]
          this.fogs.push({
            id: this.nextId++,
            x,
            y,
            density,
            radius: 8 + Math.random() * 12,
            visibility: VISIBILITY_MAP[density],
            speedPenalty: SPEED_MAP[density],
            duration: 1500 + Math.random() * 3000,
            startTick: tick,
          })
        }
      }
    }

    // Update and dissipate fogs
    for (const fog of this.fogs) {
      const elapsed = tick - fog.startTick
      if (elapsed > fog.duration * 0.7) {
        // Start dissipating
        fog.visibility = Math.min(100, fog.visibility + DISSIPATE_RATE * CHECK_INTERVAL)
        fog.radius = Math.max(0, fog.radius - 0.1)
      }
    }

    // Remove dissipated fogs
    this.fogs = this.fogs.filter(f => f.visibility < 95 && f.radius > 1)
  }

  private checkWaterNeighbor(world: World, x: number, y: number, w: number, h: number): boolean {
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [ox, oy] of offsets) {
      const nx = x + ox
      const ny = y + oy
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const t = world.getTile(nx, ny)
        if (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER) {
          return true
        }
      }
    }
    return false
  }

  getFogs(): FogBank[] {
    return this.fogs
  }

  getVisibilityAt(x: number, y: number): number {
    let minVis = 100
    for (const fog of this.fogs) {
      const dx = fog.x - x
      const dy = fog.y - y
      if (dx * dx + dy * dy <= fog.radius * fog.radius) {
        minVis = Math.min(minVis, fog.visibility)
      }
    }
    return minVis
  }
}
