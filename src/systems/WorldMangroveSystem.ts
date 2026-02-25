// World Mangrove System (v3.62) - Mangrove forests grow along tropical coastlines
// Mangroves protect against storms, nurture marine life, and filter water

import { EntityManager, PositionComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type MangroveHealth = 'flourishing' | 'healthy' | 'stressed' | 'dying'

export interface MangroveForest {
  id: number
  x: number
  y: number
  health: MangroveHealth
  density: number        // 0-100
  stormProtection: number
  biodiversityBonus: number
  waterQuality: number
  startTick: number
}

const CHECK_INTERVAL = 1300
const GROW_CHANCE = 0.004
const MAX_MANGROVES = 14
const GROWTH_RATE = 0.04

export class WorldMangroveSystem {
  private forests: MangroveForest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn mangroves at water-land boundaries
    if (this.forests.length < MAX_MANGROVES && Math.random() < GROW_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        // Check for nearby water-land boundary
        let hasWater = false
        let hasLand = false
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER) hasWater = true
            if (t === TileType.GRASS || t === TileType.SAND) hasLand = true
          }
        }

        if (hasWater && hasLand) {
          this.forests.push({
            id: this.nextId++,
            x, y,
            health: 'healthy',
            density: 20 + Math.random() * 30,
            stormProtection: 30,
            biodiversityBonus: 20,
            waterQuality: 40,
            startTick: tick,
          })
        }
      }
    }

    // Update forests
    for (let i = this.forests.length - 1; i >= 0; i--) {
      const f = this.forests[i]

      f.density = Math.min(100, f.density + GROWTH_RATE)
      f.stormProtection = f.density * 0.8
      f.biodiversityBonus = f.density * 0.6
      f.waterQuality = f.density * 0.5

      if (f.density > 70) f.health = 'flourishing'
      else if (f.density > 40) f.health = 'healthy'
      else if (f.density > 15) f.health = 'stressed'
      else f.health = 'dying'

      if (f.health === 'dying' && tick - f.startTick > 40000) {
        this.forests.splice(i, 1)
      }
    }
  }

  getForests(): readonly MangroveForest[] { return this.forests }
}
