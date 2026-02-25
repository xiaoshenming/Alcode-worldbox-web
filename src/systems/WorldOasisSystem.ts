// World Oasis System (v2.77) - Oases form in desert areas, providing water and life
// Oases attract creatures, support small settlements, and can dry up or expand

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type OasisSize = 'small' | 'medium' | 'large'

export interface Oasis {
  id: number
  x: number
  y: number
  size: OasisSize
  waterLevel: number    // 0-100
  fertility: number     // 0-100, how lush the vegetation
  age: number
  drying: boolean
  palmCount: number
}

const CHECK_INTERVAL = 1100
const MAX_OASES = 12
const FORM_CHANCE = 0.018
const DRY_CHANCE = 0.005
const WATER_REGEN = 0.8
const WATER_DECAY = 1.2
const MIN_SAND_NEIGHBORS = 10
const FERTILITY_GROWTH = 0.5

const SIZE_THRESHOLDS: Record<OasisSize, number> = {
  small: 30,
  medium: 60,
  large: 85,
}

export class WorldOasisSystem {
  private oases: Oasis[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formOases(world)
    this.updateOases(world)
    this.cleanupDried()
  }

  private formOases(world: World): void {
    if (this.oases.length >= MAX_OASES) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height
    const attempts = 20

    for (let a = 0; a < attempts; a++) {
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))

      const tile = world.getTile(x, y)
      if (tile !== TileType.SAND && tile !== TileType.GRASS) continue

      // Count sand neighbors
      let sandCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (world.getTile(x + dx, y + dy) === TileType.SAND) sandCount++
        }
      }
      if (sandCount < MIN_SAND_NEIGHBORS) continue

      // Distance check
      const tooClose = this.oases.some(o => {
        const ddx = o.x - x
        const ddy = o.y - y
        return ddx * ddx + ddy * ddy < 225
      })
      if (tooClose) continue

      this.oases.push({
        id: this.nextId++,
        x, y,
        size: 'small',
        waterLevel: 40 + Math.random() * 30,
        fertility: 10 + Math.random() * 20,
        age: 0,
        drying: false,
        palmCount: 1 + Math.floor(Math.random() * 3),
      })
      break
    }
  }

  private updateOases(world: World): void {
    for (const oasis of this.oases) {
      oasis.age++

      if (oasis.drying) {
        oasis.waterLevel = Math.max(0, oasis.waterLevel - WATER_DECAY)
        oasis.fertility = Math.max(0, oasis.fertility - 0.3)
      } else {
        oasis.waterLevel = Math.min(100, oasis.waterLevel + WATER_REGEN)
        oasis.fertility = Math.min(100, oasis.fertility + FERTILITY_GROWTH)
      }

      // Random drought
      if (!oasis.drying && Math.random() < DRY_CHANCE) {
        oasis.drying = true
      }
      // Recovery
      if (oasis.drying && oasis.waterLevel < 20 && Math.random() < 0.02) {
        oasis.drying = false
      }

      // Update size
      if (oasis.waterLevel >= SIZE_THRESHOLDS.large) oasis.size = 'large'
      else if (oasis.waterLevel >= SIZE_THRESHOLDS.medium) oasis.size = 'medium'
      else oasis.size = 'small'

      // Palm growth
      if (oasis.fertility > 50 && oasis.palmCount < 8) {
        oasis.palmCount += Math.random() < 0.05 ? 1 : 0
      }

      // Convert center tile to grass if enough water
      if (oasis.waterLevel > 60) {
        const tile = world.getTile(oasis.x, oasis.y)
        if (tile === TileType.SAND) {
          world.setTile(oasis.x, oasis.y, TileType.GRASS)
        }
      }
    }
  }

  private cleanupDried(): void {
    for (let i = this.oases.length - 1; i >= 0; i--) {
      if (this.oases[i].waterLevel <= 0 && this.oases[i].drying) {
        this.oases.splice(i, 1)
      }
    }
  }

  getOases(): Oasis[] { return this.oases }
  getActiveOases(): Oasis[] { return this.oases.filter(o => o.waterLevel > 0) }
}
