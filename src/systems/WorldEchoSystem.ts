// World Echo System (v2.75) - Sounds and echoes propagate through the world
// Battles, disasters, and large gatherings create sound waves that spread outward
// Creatures react to distant echoes: flee from battle sounds, investigate music

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type EchoSource = 'battle' | 'disaster' | 'celebration' | 'construction' | 'horn_call' | 'thunder'
const ECHO_SOURCES: EchoSource[] = ['battle', 'disaster', 'celebration', 'construction', 'horn_call', 'thunder']

export interface Echo {
  id: number
  x: number
  y: number
  source: EchoSource
  intensity: number   // 0-100, decays with distance and time
  radius: number      // current spread radius
  maxRadius: number
  speed: number       // tiles per cycle
  createdTick: number
}

const CHECK_INTERVAL = 500
const MAX_ECHOES = 20
const SPAWN_CHANCE = 0.02
const INTENSITY_DECAY = 5

const ECHO_CONFIG: Record<EchoSource, { intensity: [number, number]; maxRadius: [number, number]; speed: number }> = {
  battle: { intensity: [60, 90], maxRadius: [15, 30], speed: 4 },
  disaster: { intensity: [80, 100], maxRadius: [25, 50], speed: 5 },
  celebration: { intensity: [40, 70], maxRadius: [10, 20], speed: 3 },
  construction: { intensity: [30, 50], maxRadius: [8, 15], speed: 2 },
  horn_call: { intensity: [50, 80], maxRadius: [20, 40], speed: 6 },
  thunder: { intensity: [70, 95], maxRadius: [30, 60], speed: 7 },
}

// Mountains block/reflect sound, water carries it further
const TERRAIN_MULTIPLIER: Partial<Record<number, number>> = {
  [TileType.MOUNTAIN]: 0.3,
  [TileType.DEEP_WATER]: 1.4,
  [TileType.SHALLOW_WATER]: 1.2,
  [TileType.FOREST]: 0.7,
}

export class WorldEchoSystem {
  private echoes: Echo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnEchoes(world, tick)
    this.propagateEchoes(world)
  }

  private spawnEchoes(world: World, tick: number): void {
    if (this.echoes.length >= MAX_ECHOES) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.echoes.length >= MAX_ECHOES) break
      if (Math.random() > SPAWN_CHANCE) continue

      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)
      if (tile === null || tile === TileType.DEEP_WATER || tile === TileType.LAVA) continue

      const sources = ECHO_SOURCES
      const source = sources[Math.floor(Math.random() * sources.length)]
      const config = ECHO_CONFIG[source]

      const [minI, maxI] = config.intensity
      const [minR, maxR] = config.maxRadius

      this.echoes.push({
        id: this.nextId++,
        x, y,
        source,
        intensity: minI + Math.floor(Math.random() * (maxI - minI)),
        radius: 0,
        maxRadius: minR + Math.floor(Math.random() * (maxR - minR)),
        speed: config.speed,
        createdTick: tick,
      })
    }
  }

  private propagateEchoes(world: World): void {
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const echo = this.echoes[i]

      // Expand radius
      echo.radius = Math.min(echo.maxRadius, echo.radius + echo.speed)

      // Terrain at wavefront affects intensity
      const sampleX = Math.floor(echo.x + echo.radius * (Math.random() - 0.5))
      const sampleY = Math.floor(echo.y + echo.radius * (Math.random() - 0.5))
      if (sampleX >= 0 && sampleX < world.width && sampleY >= 0 && sampleY < world.height) {
        const tile = world.getTile(sampleX, sampleY)
        const mult = TERRAIN_MULTIPLIER[tile as number] ?? 1.0
        echo.intensity *= mult
      }

      // Natural decay
      echo.intensity = Math.max(0, echo.intensity - INTENSITY_DECAY)

      if (echo.intensity <= 0 || echo.radius >= echo.maxRadius) {
        this.echoes.splice(i, 1)
      }
    }
  }

}
