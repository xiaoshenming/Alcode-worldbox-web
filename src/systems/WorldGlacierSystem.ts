// World Glacier System (v3.06) - Glaciers form and move in cold regions
// Slow-moving ice masses reshape terrain, carve valleys, and create lakes

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface Glacier {
  id: number
  x: number
  y: number
  length: number
  width: number
  direction: number
  speed: number       // very slow
  mass: number        // 0-100
  age: number
  active: boolean
}

const CHECK_INTERVAL = 1500
const MAX_GLACIERS = 6
const FORM_CHANCE = 0.01
const MIN_SNOW_TILES = 10

export class WorldGlacierSystem {
  private glaciers: Glacier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formGlaciers(world)
    this.moveGlaciers(world)
    this.cleanup()
  }

  private formGlaciers(world: World): void {
    if (this.glaciers.length >= MAX_GLACIERS) return
    if (Math.random() > FORM_CHANCE) return

    const w = world.width
    const h = world.height

    for (let a = 0; a < 15; a++) {
      const x = 5 + Math.floor(Math.random() * (w - 10))
      const y = 5 + Math.floor(Math.random() * (h - 10))
      const tile = world.getTile(x, y)
      if (tile !== TileType.SNOW && tile !== TileType.MOUNTAIN) continue

      let snowCount = 0
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const t = world.getTile(x + dx, y + dy)
          if (t === TileType.SNOW || t === TileType.MOUNTAIN) snowCount++
        }
      }
      if (snowCount < MIN_SNOW_TILES) continue

      this.glaciers.push({
        id: this.nextId++,
        x, y,
        length: 3 + Math.floor(Math.random() * 5),
        width: 2 + Math.floor(Math.random() * 3),
        direction: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.05,
        mass: 50 + Math.random() * 50,
        age: 0,
        active: true,
      })
      break
    }
  }

  private moveGlaciers(world: World): void {
    for (const g of this.glaciers) {
      g.age++
      g.x += Math.cos(g.direction) * g.speed
      g.y += Math.sin(g.direction) * g.speed
      g.x = Math.max(2, Math.min(world.width - 2, g.x))
      g.y = Math.max(2, Math.min(world.height - 2, g.y))
      g.mass *= 0.9995
      if (g.mass < 10) g.active = false
    }
  }

  private cleanup(): void {
    for (let i = this.glaciers.length - 1; i >= 0; i--) {
      if (!this.glaciers[i].active) this.glaciers.splice(i, 1)
    }
  }

  private _activeGlaciersBuf: Glacier[] = []
  getGlaciers(): Glacier[] { return this.glaciers }
  getActiveGlaciers(): Glacier[] {
    this._activeGlaciersBuf.length = 0
    for (const g of this.glaciers) { if (g.active) this._activeGlaciersBuf.push(g) }
    return this._activeGlaciersBuf
  }
}
