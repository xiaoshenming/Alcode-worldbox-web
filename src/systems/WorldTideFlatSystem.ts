// World Tide Flat System (v3.152) - Tidal flats are exposed and submerged
// by rising and falling tides, cycling nutrients along coastlines

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface TideFlat {
  id: number
  x: number
  y: number
  exposure: number    // 0-100, how exposed the flat is (0=submerged, 100=dry)
  organisms: number   // biodiversity count in the zone
  tidePhase: number   // 0-2PI, current tidal cycle position
  nutrients: number   // 0-100, nutrient richness
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_TIDE_FLATS = 15
const TIDE_SPEED = 0.12
const NUTRIENT_DEPOSIT_RATE = 1.5

export class WorldTideFlatSystem {
  private tideFlats: TideFlat[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.detectTideFlats(world, tick)
    this.cycleTides(world)
    this.cleanup()
  }

  private detectTideFlats(world: World, tick: number): void {
    if (this.tideFlats.length >= MAX_TIDE_FLATS) return
    if (Math.random() > SPAWN_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = 2 + Math.floor(Math.random() * (w - 4))
      const y = 2 + Math.floor(Math.random() * (h - 4))
      const tile = world.getTile(x, y)

      // Tide flats form on sand adjacent to water
      if (tile !== TileType.SAND) continue

      let waterN = 0
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nt = world.getTile(x + dx, y + dy)
          if (nt === TileType.SHALLOW_WATER || nt === TileType.DEEP_WATER) waterN++
        }
      }
      if (waterN < 2) continue

      const exists = this.tideFlats.some(
        tf => Math.abs(tf.x - x) < 4 && Math.abs(tf.y - y) < 4
      )
      if (exists) continue

      this.tideFlats.push({
        id: this.nextId++,
        x, y,
        exposure: 50,
        organisms: Math.floor(Math.random() * 10),
        tidePhase: Math.random() * Math.PI * 2,
        nutrients: 20 + Math.random() * 30,
        tick,
      })
      break
    }
  }

  private cycleTides(world: World): void {
    for (const flat of this.tideFlats) {
      flat.tidePhase = (flat.tidePhase + TIDE_SPEED) % (Math.PI * 2)
      flat.exposure = Math.max(0, Math.min(100, 50 + Math.sin(flat.tidePhase) * 50))

      if (flat.exposure > 60) {
        flat.nutrients = Math.min(100, flat.nutrients + NUTRIENT_DEPOSIT_RATE)
      }
      if (flat.nutrients > 50 && Math.random() < 0.08) {
        flat.organisms = Math.min(50, flat.organisms + 1)
      }

      world.setTile(flat.x, flat.y, flat.exposure < 10 ? TileType.SHALLOW_WATER : TileType.SAND)

      if (flat.nutrients <= 0 && flat.organisms <= 0) flat.nutrients = -1
    }
  }

  private cleanup(): void {
    for (let i = this.tideFlats.length - 1; i >= 0; i--) {
      if (this.tideFlats[i].nutrients < 0) {
        this.tideFlats.splice(i, 1)
      }
    }
  }

  getTideFlats(): TideFlat[] { return this.tideFlats }
}
