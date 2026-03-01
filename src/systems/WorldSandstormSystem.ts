// World Sandstorm System (v3.80) - Massive sandstorms sweep desert regions
// Sandstorms damage buildings, reduce visibility, and reshape terrain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type StormSeverity = 'mild' | 'moderate' | 'severe' | 'catastrophic'

export interface Sandstorm {
  id: number
  x: number
  y: number
  radius: number
  severity: StormSeverity
  direction: number
  speed: number
  damage: number
  tick: number
}

const CHECK_INTERVAL = 1600
const STORM_CHANCE = 0.005
const MAX_STORMS = 15

const SEVERITIES: StormSeverity[] = ['mild', 'moderate', 'severe', 'catastrophic']

export class WorldSandstormSystem {
  private storms: Sandstorm[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.storms.length < MAX_STORMS && Math.random() < STORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Only spawn in desert/sand areas (tile type 3 = sand/beach)
      if (tile !== null && tile === 3) {
        const sevIdx = Math.floor(Math.random() * SEVERITIES.length)
        this.storms.push({
          id: this.nextId++,
          x, y,
          radius: 8 + Math.floor(Math.random() * 15),
          severity: SEVERITIES[sevIdx],
          direction: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 2,
          damage: (sevIdx + 1) * 10,
          tick,
        })
      }
    }

    // Move storms
    for (const storm of this.storms) {
      storm.x += Math.cos(storm.direction) * storm.speed
      storm.y += Math.sin(storm.direction) * storm.speed
      storm.direction += (Math.random() - 0.5) * 0.1
    }

    const cutoff = tick - 12000
    for (let i = this.storms.length - 1; i >= 0; i--) {
      if (this.storms[i].tick < cutoff) this.storms.splice(i, 1)
    }
  }

}
