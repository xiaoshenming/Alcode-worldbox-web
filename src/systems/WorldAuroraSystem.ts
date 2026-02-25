// World Aurora System (v3.75) - Northern/southern lights appear in polar regions
// Auroras boost morale, inspire art, and have mystical effects on magic users

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AuroraColor = 'green' | 'blue' | 'purple' | 'red' | 'pink' | 'white'
export type AuroraIntensity = 'faint' | 'moderate' | 'bright' | 'spectacular'

export interface AuroraEvent {
  id: number
  x: number
  y: number
  width: number
  color: AuroraColor
  secondaryColor: AuroraColor
  intensity: AuroraIntensity
  moraleBoost: number
  tick: number
}

const CHECK_INTERVAL = 1800
const AURORA_CHANCE = 0.008
const MAX_AURORAS = 20

const COLORS: AuroraColor[] = ['green', 'blue', 'purple', 'red', 'pink', 'white']
const INTENSITIES: AuroraIntensity[] = ['faint', 'moderate', 'bright', 'spectacular']

export class WorldAuroraSystem {
  private auroras: AuroraEvent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn auroras in polar regions (top/bottom of map)
    if (this.auroras.length < MAX_AURORAS && Math.random() < AURORA_CHANCE) {
      const w = world.width
      const h = world.height
      const isPolar = Math.random() < 0.5
      const y = isPolar ? Math.floor(Math.random() * (h * 0.15)) : h - Math.floor(Math.random() * (h * 0.15))
      const x = Math.floor(Math.random() * w)
      const width = 15 + Math.floor(Math.random() * 30)

      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      let secondary = COLORS[Math.floor(Math.random() * COLORS.length)]
      if (secondary === color) secondary = COLORS[(COLORS.indexOf(color) + 1) % COLORS.length]

      const intensityIdx = Math.floor(Math.random() * INTENSITIES.length)
      const intensity = INTENSITIES[intensityIdx]

      this.auroras.push({
        id: this.nextId++,
        x, y, width,
        color,
        secondaryColor: secondary,
        intensity,
        moraleBoost: (intensityIdx + 1) * 5,
        tick,
      })
    }

    // Fade old auroras
    const cutoff = tick - 15000
    for (let i = this.auroras.length - 1; i >= 0; i--) {
      if (this.auroras[i].tick < cutoff) {
        this.auroras.splice(i, 1)
      }
    }
  }

  getAuroras(): readonly AuroraEvent[] { return this.auroras }
}
