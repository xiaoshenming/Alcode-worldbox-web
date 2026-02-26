// World Aurora Storm System (v2.97) - Intense aurora events affect magic and mood
// Aurora storms boost magical abilities but can disrupt navigation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface AuroraStorm {
  id: number
  x: number
  y: number
  radius: number
  intensity: number    // 0-100
  hue: number          // color shift 0-360
  duration: number
  maxDuration: number
  active: boolean
}

const CHECK_INTERVAL = 600
const MAX_STORMS = 3
const FORM_CHANCE = 0.01
const MAGIC_BOOST = 1.5

export class WorldAuroraStormSystem {
  private storms: AuroraStorm[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formStorms(world)
    this.evolveStorms()
    this.cleanup()
  }

  private formStorms(world: World): void {
    if (this.storms.length >= MAX_STORMS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    this.storms.push({
      id: this.nextId++,
      x: Math.floor(Math.random() * w),
      y: Math.floor(Math.random() * h),
      radius: 15 + Math.floor(Math.random() * 20),
      intensity: 40 + Math.random() * 60,
      hue: Math.floor(Math.random() * 360),
      duration: 0,
      maxDuration: 2000 + Math.floor(Math.random() * 3000),
      active: true,
    })
  }

  private evolveStorms(): void {
    for (const storm of this.storms) {
      storm.duration++

      // Hue shifts slowly
      storm.hue = (storm.hue + 0.5) % 360

      // Intensity pulses
      storm.intensity += (Math.random() - 0.5) * 10
      storm.intensity = Math.max(20, Math.min(100, storm.intensity))

      // Radius breathes
      storm.radius += (Math.random() - 0.5) * 2
      storm.radius = Math.max(8, Math.min(40, storm.radius))

      if (storm.duration >= storm.maxDuration) {
        storm.active = false
      }
    }
  }

  private cleanup(): void {
    for (let i = this.storms.length - 1; i >= 0; i--) {
      if (!this.storms[i].active) {
        this.storms.splice(i, 1)
      }
    }
  }

  getMagicBoost(): number {
    return this.storms.length > 0 ? MAGIC_BOOST : 1.0
  }

  getStorms(): AuroraStorm[] { return this.storms }
  getActiveStorms(): AuroraStorm[] { return this.storms.filter(s => s.active) }
}
