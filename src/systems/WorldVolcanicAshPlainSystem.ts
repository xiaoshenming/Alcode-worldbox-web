// World Volcanic Ash Plain System (v3.234) - Vast plains covered in volcanic ash
// Fertile but barren landscapes formed by massive eruptions, slowly reclaimed by life

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface VolcanicAshPlain {
  id: number
  x: number
  y: number
  radius: number
  ashDepth: number
  fertility: number
  revegetation: number
  particleDensity: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_PLAINS = 24

export class WorldVolcanicAshPlainSystem {
  private plains: VolcanicAshPlain[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.plains.length < MAX_PLAINS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        const radius = 4 + Math.floor(Math.random() * 6)
        this.plains.push({
          id: this.nextId++,
          x, y, radius,
          ashDepth: 5 + Math.random() * 20,
          fertility: 30 + Math.random() * 40,
          revegetation: 0,
          particleDensity: 50 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const plain of this.plains) {
      plain.ashDepth = Math.max(0.5, plain.ashDepth - 0.003)
      plain.revegetation = Math.min(100, plain.revegetation + 0.015)
      plain.fertility = Math.min(100, plain.fertility + plain.revegetation * 0.001)
      plain.particleDensity = Math.max(5, plain.particleDensity - 0.01)
    }

    const cutoff = tick - 88000
    for (let i = this.plains.length - 1; i >= 0; i--) {
      if (this.plains[i].tick < cutoff) {
        this.plains.splice(i, 1)
      }
    }
  }

  getPlains(): readonly VolcanicAshPlain[] { return this.plains }
}
