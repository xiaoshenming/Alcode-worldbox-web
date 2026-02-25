// World Lighthouse System (v3.105) - Coastal lighthouses guide ships and warn of danger
// Lighthouses are built on coastlines, emit light beams, and improve naval safety

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type LighthouseState = 'building' | 'active' | 'damaged' | 'ruined'

export interface Lighthouse {
  id: number
  x: number
  y: number
  state: LighthouseState
  beamRange: number
  beamAngle: number
  rotationSpeed: number
  durability: number
  tick: number
}

const CHECK_INTERVAL = 2500
const BUILD_CHANCE = 0.003
const MAX_LIGHTHOUSES = 15

export class WorldLighthouseSystem {
  private lighthouses: Lighthouse[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build on coastlines
    if (this.lighthouses.length < MAX_LIGHTHOUSES && Math.random() < BUILD_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === 2) {
        let nearWater = false
        for (let dx = -1; dx <= 1 && !nearWater; dx++) {
          for (let dy = -1; dy <= 1 && !nearWater; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t != null && t <= 1) nearWater = true
          }
        }
        if (nearWater && !this.hasLighthouseNear(x, y, 15)) {
          this.lighthouses.push({
            id: this.nextId++,
            x, y,
            state: 'building',
            beamRange: 10 + Math.floor(Math.random() * 15),
            beamAngle: 0,
            rotationSpeed: 0.5 + Math.random() * 1.5,
            durability: 100,
            tick,
          })
        }
      }
    }

    // Update lighthouses
    for (const lh of this.lighthouses) {
      switch (lh.state) {
        case 'building':
          if (tick - lh.tick > 5000) lh.state = 'active'
          break
        case 'active':
          lh.beamAngle = (lh.beamAngle + lh.rotationSpeed) % 360
          lh.durability -= 0.02
          if (lh.durability < 30) lh.state = 'damaged'
          break
        case 'damaged':
          lh.beamAngle = (lh.beamAngle + lh.rotationSpeed * 0.3) % 360
          lh.durability -= 0.01
          if (lh.durability < 5) lh.state = 'ruined'
          if (Math.random() < 0.01) { lh.durability = 70; lh.state = 'active' }
          break
        case 'ruined':
          break
      }
    }

    // Remove ruined lighthouses after time
    const cutoff = tick - 100000
    for (let i = this.lighthouses.length - 1; i >= 0; i--) {
      if (this.lighthouses[i].state === 'ruined' && this.lighthouses[i].tick < cutoff) {
        this.lighthouses.splice(i, 1)
      }
    }
  }

  private hasLighthouseNear(x: number, y: number, radius: number): boolean {
    for (const lh of this.lighthouses) {
      const dx = lh.x - x, dy = lh.y - y
      if (dx * dx + dy * dy < radius * radius) return true
    }
    return false
  }

  getLighthouses(): readonly Lighthouse[] { return this.lighthouses }
}
