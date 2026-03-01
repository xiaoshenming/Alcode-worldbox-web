// World Whirlwind System (v3.85) - Localized spinning wind phenomena
// Whirlwinds scatter debris, displace creatures, and reshape landscapes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WhirlwindSize = 'dust_devil' | 'small' | 'medium' | 'large' | 'massive'

export interface Whirlwind {
  id: number
  x: number
  y: number
  size: WhirlwindSize
  rotation: number
  speed: number
  force: number
  direction: number
  tick: number
}

const CHECK_INTERVAL = 1200
const SPAWN_CHANCE = 0.006
const MAX_WHIRLWINDS = 25

const SIZES: WhirlwindSize[] = ['dust_devil', 'small', 'medium', 'large', 'massive']

export class WorldWhirlwindSystem {
  private whirlwinds: Whirlwind[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.whirlwinds.length < MAX_WHIRLWINDS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Spawn on land tiles
      if (tile !== null && tile >= 3) {
        const sizeIdx = Math.floor(Math.random() * SIZES.length)
        this.whirlwinds.push({
          id: this.nextId++,
          x, y,
          size: SIZES[sizeIdx],
          rotation: Math.random() * Math.PI * 2,
          speed: 1 + Math.random() * 3,
          force: (sizeIdx + 1) * 8,
          direction: Math.random() * Math.PI * 2,
          tick,
        })
      }
    }

    // Move whirlwinds
    for (const ww of this.whirlwinds) {
      ww.x += Math.cos(ww.direction) * ww.speed
      ww.y += Math.sin(ww.direction) * ww.speed
      ww.rotation += 0.3
      ww.direction += (Math.random() - 0.5) * 0.15
      ww.force = Math.max(0, ww.force - 0.02)
    }

    const cutoff = tick - 8000
    for (let i = this.whirlwinds.length - 1; i >= 0; i--) {
      if (this.whirlwinds[i].tick < cutoff || this.whirlwinds[i].force <= 0) {
        this.whirlwinds.splice(i, 1)
      }
    }
  }

}
