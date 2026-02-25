// World Geoglyph System (v3.118) - Giant ground drawings visible from above
// Civilizations carve massive symbols into terrain for spiritual purposes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GeoglyphShape = 'spiral' | 'animal' | 'geometric' | 'humanoid' | 'celestial'

export interface Geoglyph {
  id: number
  x: number
  y: number
  shape: GeoglyphShape
  size: number
  spiritualPower: number
  visibility: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 4000
const BUILD_CHANCE = 0.002
const MAX_GEOGLYPHS = 10

const SHAPES: GeoglyphShape[] = ['spiral', 'animal', 'geometric', 'humanoid', 'celestial']
const SHAPE_POWER: Record<GeoglyphShape, number> = {
  spiral: 8, animal: 12, geometric: 6, humanoid: 15, celestial: 20,
}

export class WorldGeoglyphSystem {
  private geoglyphs: Geoglyph[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Create geoglyphs on flat terrain (sand or grassland)
    if (this.geoglyphs.length < MAX_GEOGLYPHS && Math.random() < BUILD_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && (tile === 2 || tile === 3)) {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
        this.geoglyphs.push({
          id: this.nextId++,
          x, y,
          shape,
          size: 3 + Math.floor(Math.random() * 8),
          spiritualPower: SHAPE_POWER[shape],
          visibility: 80 + Math.floor(Math.random() * 20),
          age: 0,
          tick,
        })
      }
    }

    // Update geoglyphs
    for (const g of this.geoglyphs) {
      g.age = tick - g.tick
      // Erosion reduces visibility over time
      if (g.age > 100000) {
        g.visibility = Math.max(10, g.visibility - 0.03)
      }
      // Spiritual power fluctuates
      g.spiritualPower = SHAPE_POWER[g.shape] * (0.8 + 0.2 * Math.sin(tick * 0.0001))
    }

    // Remove eroded geoglyphs
    for (let i = this.geoglyphs.length - 1; i >= 0; i--) {
      if (this.geoglyphs[i].visibility <= 10) this.geoglyphs.splice(i, 1)
    }
  }

  getGeoglyphs(): readonly Geoglyph[] { return this.geoglyphs }
}
