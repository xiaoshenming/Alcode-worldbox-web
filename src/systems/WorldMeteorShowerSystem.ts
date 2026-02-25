// World Meteor Shower System (v3.95) - Spectacular meteor showers rain down from the sky
// Meteors vary in size, can deposit resources or cause destruction

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MeteorSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive'

export interface Meteor {
  id: number
  x: number
  y: number
  size: MeteorSize
  speed: number
  damage: number
  resources: number
  tick: number
}

const CHECK_INTERVAL = 3000
const SHOWER_CHANCE = 0.002
const MAX_METEORS = 20

const METEOR_SIZES: MeteorSize[] = ['tiny', 'small', 'medium', 'large', 'massive']

const DAMAGE_BASE: Record<MeteorSize, number> = {
  tiny: 5, small: 15, medium: 30, large: 60, massive: 100,
}

const RESOURCE_BASE: Record<MeteorSize, number> = {
  tiny: 2, small: 5, medium: 12, large: 25, massive: 50,
}

export class WorldMeteorShowerSystem {
  private meteors: Meteor[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Trigger meteor shower
    if (this.meteors.length < MAX_METEORS && Math.random() < SHOWER_CHANCE) {
      const count = 1 + Math.floor(Math.random() * 5)
      const cx = Math.floor(Math.random() * world.width)
      const cy = Math.floor(Math.random() * world.height)

      for (let i = 0; i < count && this.meteors.length < MAX_METEORS; i++) {
        const x = Math.max(0, Math.min(world.width - 1, cx + Math.floor((Math.random() - 0.5) * 20)))
        const y = Math.max(0, Math.min(world.height - 1, cy + Math.floor((Math.random() - 0.5) * 20)))
        const sizeIdx = Math.floor(Math.random() * METEOR_SIZES.length)
        const size = METEOR_SIZES[sizeIdx]

        this.meteors.push({
          id: this.nextId++,
          x, y, size,
          speed: 10 + Math.random() * 40,
          damage: DAMAGE_BASE[size] * (0.6 + Math.random() * 0.4),
          resources: RESOURCE_BASE[size] * (0.5 + Math.random() * 0.5),
          tick,
        })
      }
    }

    // Process impacts and expire
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]
      const age = tick - m.tick

      // Meteors impact after a short delay then expire
      if (age > 500) {
        this.meteors.splice(i, 1)
      }
    }
  }

  getMeteors(): readonly Meteor[] { return this.meteors }
  getActiveMeteors(): Meteor[] {
    return this.meteors.filter(m => m.damage > 0)
  }
}
