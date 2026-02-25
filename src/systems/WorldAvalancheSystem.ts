// World Avalanche System (v3.90) - Avalanches cascade down snowy mountains
// Snow masses displace creatures, destroy structures, and reshape terrain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AvalancheSize = 'small' | 'medium' | 'large' | 'catastrophic'

export interface Avalanche {
  id: number
  x: number
  y: number
  size: AvalancheSize
  speed: number
  direction: number
  force: number
  tick: number
}

const CHECK_INTERVAL = 1400
const SPAWN_CHANCE = 0.003
const MAX_AVALANCHES = 15

const SIZES: AvalancheSize[] = ['small', 'medium', 'large', 'catastrophic']

export class WorldAvalancheSystem {
  private avalanches: Avalanche[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.avalanches.length < MAX_AVALANCHES && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Spawn on snowy mountain terrain
      if (tile !== null && tile >= 7) {
        const sizeIdx = Math.floor(Math.random() * SIZES.length)
        this.avalanches.push({
          id: this.nextId++,
          x, y,
          size: SIZES[sizeIdx],
          speed: 2 + Math.random() * 4,
          direction: Math.random() * Math.PI * 2,
          force: (sizeIdx + 1) * 15,
          tick,
        })
      }
    }

    // Move avalanches downhill
    for (const a of this.avalanches) {
      a.x += Math.cos(a.direction) * a.speed
      a.y += Math.sin(a.direction) * a.speed
      a.speed = Math.max(0.5, a.speed - 0.05)
      a.force = Math.max(0, a.force - 0.1)
    }

    const cutoff = tick - 6000
    for (let i = this.avalanches.length - 1; i >= 0; i--) {
      if (this.avalanches[i].tick < cutoff || this.avalanches[i].force <= 0) {
        this.avalanches.splice(i, 1)
      }
    }
  }

  getAvalanches(): readonly Avalanche[] { return this.avalanches }
}
