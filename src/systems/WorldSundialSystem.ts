// World Sundial System (v3.115) - Ancient timekeeping monuments
// Sundials are built in open areas to track time and boost knowledge

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SundialSize = 'small' | 'medium' | 'large' | 'monumental'

export interface Sundial {
  id: number
  x: number
  y: number
  size: SundialSize
  accuracy: number
  age: number
  knowledgeBonus: number
  shadowAngle: number
  tick: number
}

const CHECK_INTERVAL = 3000
const BUILD_CHANCE = 0.003
const MAX_SUNDIALS = 15

const SIZES: SundialSize[] = ['small', 'medium', 'large', 'monumental']
const SIZE_BONUS: Record<SundialSize, number> = {
  small: 5, medium: 12, large: 20, monumental: 35,
}

export class WorldSundialSystem {
  private sundials: Sundial[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build sundials on open grassland
    if (this.sundials.length < MAX_SUNDIALS && Math.random() < BUILD_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === 3) {
        const size = SIZES[Math.floor(Math.random() * SIZES.length)]
        this.sundials.push({
          id: this.nextId++,
          x, y,
          size,
          accuracy: 50 + Math.floor(Math.random() * 40),
          age: 0,
          knowledgeBonus: SIZE_BONUS[size],
          shadowAngle: 0,
          tick,
        })
      }
    }

    // Update shadow angles (simulating time of day)
    for (const s of this.sundials) {
      s.shadowAngle = (tick * 0.01) % 360
      s.age = tick - s.tick
      // Accuracy degrades with age
      if (s.age > 80000) {
        s.accuracy = Math.max(10, s.accuracy - 0.05)
      }
    }

    // Remove very old sundials
    const cutoff = tick - 250000
    for (let i = this.sundials.length - 1; i >= 0; i--) {
      if (this.sundials[i].tick < cutoff) this.sundials.splice(i, 1)
    }
  }

  getSundials(): readonly Sundial[] { return this.sundials }
}
