// World Northern Lights System (v3.100) - Spectacular aurora displays in polar regions
// Auroras appear in the northern part of the world with varying intensity and colors

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AuroraIntensity = 'faint' | 'moderate' | 'bright' | 'spectacular'

export interface NorthernLights {
  id: number
  x: number
  y: number
  intensity: AuroraIntensity
  colors: string[]
  width: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.005
const MAX_AURORAS = 10

const INTENSITIES: AuroraIntensity[] = ['faint', 'moderate', 'bright', 'spectacular']
const COLOR_PALETTES = [
  ['#00ff88', '#00ccff'],
  ['#ff00ff', '#8800ff', '#00ffcc'],
  ['#00ff44', '#44ffaa', '#0088ff'],
  ['#ff4488', '#ff00cc', '#8844ff', '#00ffff'],
]

export class WorldNorthernLightsSystem {
  private auroras: NorthernLights[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn in northern region (top 20% of map)
    if (this.auroras.length < MAX_AURORAS && Math.random() < SPAWN_CHANCE) {
      const maxY = Math.floor(world.height * 0.2)
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * maxY)

      const intensityIdx = Math.floor(Math.random() * INTENSITIES.length)
      const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]

      this.auroras.push({
        id: this.nextId++,
        x, y,
        intensity: INTENSITIES[intensityIdx],
        colors: palette,
        width: 10 + Math.floor(Math.random() * 30),
        duration: 5000 + Math.floor(Math.random() * 15000),
        tick,
      })
    }

    // Evolve intensity
    for (const a of this.auroras) {
      const age = tick - a.tick
      const progress = age / a.duration
      if (progress < 0.3) {
        a.intensity = INTENSITIES[Math.min(3, Math.floor(progress * 10))]
      } else if (progress > 0.7) {
        a.intensity = INTENSITIES[Math.max(0, 3 - Math.floor((progress - 0.7) * 10))]
      }
    }

    // Remove expired
    for (let i = this.auroras.length - 1; i >= 0; i--) {
      if (tick - this.auroras[i].tick > this.auroras[i].duration) {
        this.auroras.splice(i, 1)
      }
    }
  }

}
