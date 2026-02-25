// World Coral Reef System (v2.84) - Coral reefs grow in shallow water near coastlines
// Reefs attract marine life, protect coastlines, and can be damaged by pollution

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export interface CoralReef {
  id: number
  x: number
  y: number
  health: number       // 0-100
  growth: number       // 0-100, maturity level
  biodiversity: number // 0-50, species richness
  bleached: boolean
  age: number
}

const CHECK_INTERVAL = 700
const MAX_REEFS = 30
const FORM_CHANCE = 0.025
const GROWTH_RATE = 0.4
const BIODIVERSITY_GAIN = 0.15
const BLEACH_THRESHOLD = 30
const RECOVERY_RATE = 0.2
const MIN_SHALLOW_NEIGHBORS = 3
const MAX_DEEP_NEIGHBORS = 4

export class WorldCoralReefSystem {
  private reefs: CoralReef[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formReefs(world)
    this.growReefs()
    this.checkBleaching()
    this.cleanup()
  }

  private formReefs(world: World): void {
    if (this.reefs.length >= MAX_REEFS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height
    const attempts = 20

    for (let a = 0; a < attempts; a++) {
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))

      const tile = world.getTile(x, y)
      if (tile !== TileType.SHALLOW_WATER) continue

      // Count neighbors
      let shallowCount = 0
      let deepCount = 0
      let landCount = 0
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx === 0 && dy === 0) continue
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.SHALLOW_WATER) shallowCount++
          else if (t === TileType.DEEP_WATER) deepCount++
          else landCount++
        }
      }

      // Need shallow water and some land nearby (coastline)
      if (shallowCount < MIN_SHALLOW_NEIGHBORS) continue
      if (deepCount > MAX_DEEP_NEIGHBORS) continue
      if (landCount < 2) continue

      // Not too close to existing reefs
      const tooClose = this.reefs.some(r => {
        const ddx = r.x - x
        const ddy = r.y - y
        return ddx * ddx + ddy * ddy < 36
      })
      if (tooClose) continue

      this.reefs.push({
        id: this.nextId++,
        x, y,
        health: 80 + Math.random() * 20,
        growth: 10 + Math.random() * 20,
        biodiversity: 5 + Math.floor(Math.random() * 10),
        bleached: false,
        age: 0,
      })
      break
    }
  }

  private growReefs(): void {
    for (const reef of this.reefs) {
      reef.age++

      if (!reef.bleached) {
        // Healthy growth
        reef.growth = Math.min(100, reef.growth + GROWTH_RATE)
        reef.biodiversity = Math.min(50, reef.biodiversity + BIODIVERSITY_GAIN)
        // Health slowly recovers
        reef.health = Math.min(100, reef.health + RECOVERY_RATE)
      } else {
        // Bleached reefs lose biodiversity
        reef.biodiversity = Math.max(0, reef.biodiversity - 0.3)
        reef.health = Math.max(0, reef.health - 0.5)

        // Chance to recover from bleaching
        if (reef.health > BLEACH_THRESHOLD + 10 && Math.random() < 0.05) {
          reef.bleached = false
        }
      }
    }
  }

  private checkBleaching(): void {
    for (const reef of this.reefs) {
      if (reef.bleached) continue

      // Random stress events can cause bleaching
      if (reef.health < BLEACH_THRESHOLD && Math.random() < 0.1) {
        reef.bleached = true
      }

      // Small random chance of health drop (environmental stress)
      if (Math.random() < 0.08) {
        reef.health = Math.max(0, reef.health - (2 + Math.random() * 5))
      }
    }
  }

  private cleanup(): void {
    for (let i = this.reefs.length - 1; i >= 0; i--) {
      if (this.reefs[i].health <= 0 && this.reefs[i].bleached) {
        this.reefs.splice(i, 1)
      }
    }
  }

  getReefs(): CoralReef[] { return this.reefs }
  getHealthyReefs(): CoralReef[] { return this.reefs.filter(r => !r.bleached) }
  getBleachedReefs(): CoralReef[] { return this.reefs.filter(r => r.bleached) }
}
