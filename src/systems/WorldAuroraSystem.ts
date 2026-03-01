// World Aurora System (v3.140) - Aurora phenomena in polar regions
// Aurora intensity and color patterns shift over time

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AuroraColorPattern = 'green' | 'purple' | 'blue' | 'multicolor'

export interface AuroraEvent {
  id: number
  x: number
  y: number
  colorPattern: AuroraColorPattern
  intensity: number
  width: number
  height: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3600
const SPAWN_CHANCE = 0.003
const MAX_AURORAS = 8

const PATTERNS: AuroraColorPattern[] = ['green', 'purple', 'blue', 'multicolor']
const PATTERN_INTENSITY: Record<AuroraColorPattern, number> = {
  green: 50, purple: 65, blue: 55, multicolor: 80,
}

export class WorldAuroraSystem {
  private auroras: AuroraEvent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.auroras.length < MAX_AURORAS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      // Polar regions: top or bottom 15% of map
      const isPolar = Math.random() < 0.5
      const y = isPolar
        ? Math.floor(Math.random() * (h * 0.15))
        : h - Math.floor(Math.random() * (h * 0.15))
      const x = Math.floor(Math.random() * w)
      const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]

      this.auroras.push({
        id: this.nextId++,
        x, y,
        colorPattern: pattern,
        intensity: PATTERN_INTENSITY[pattern],
        width: 10 + Math.floor(Math.random() * 25),
        height: 3 + Math.floor(Math.random() * 6),
        active: true,
        tick,
      })
    }

    for (const a of this.auroras) {
      // Intensity oscillates over time
      a.intensity = PATTERN_INTENSITY[a.colorPattern] *
        (0.5 + 0.5 * Math.sin(tick * 0.0004 + a.id * 2))
      // Color pattern can shift for multicolor
      if (a.colorPattern === 'multicolor' && Math.random() < 0.002) {
        a.width = Math.min(50, a.width + 1)
      }
      const age = tick - a.tick
      if (age > 180000) a.active = false
    }

    for (let i = this.auroras.length - 1; i >= 0; i--) {
      if (!this.auroras[i].active) this.auroras.splice(i, 1)
    }
  }

}
