// World Geothermal System (v2.62) - Hot springs and geysers
// Geothermal vents form near mountains and lava, provide warmth and resources
// Geysers erupt periodically, hot springs heal nearby creatures

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type GeothermalType = 'hot_spring' | 'geyser' | 'fumarole' | 'mud_pot' | 'steam_vent'

export interface GeothermalFeature {
  id: number
  x: number
  y: number
  type: GeothermalType
  temperature: number    // 40-200 celsius
  activity: number       // 0-100
  lastEruption: number   // tick of last eruption (geysers)
  eruptionInterval: number
  healRadius: number
}

const CHECK_INTERVAL = 1000
const MAX_FEATURES = 40
const SPAWN_CHANCE = 0.01

const TEMP_RANGE: Record<GeothermalType, [number, number]> = {
  hot_spring: [40, 70],
  geyser: [80, 150],
  fumarole: [100, 200],
  mud_pot: [50, 90],
  steam_vent: [60, 120],
}

const TYPES: GeothermalType[] = ['hot_spring', 'geyser', 'fumarole', 'mud_pot', 'steam_vent']

export class WorldGeothermalSystem {
  private features: GeothermalFeature[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnFeatures(world)
    this.updateActivity(tick)
  }

  private spawnFeatures(world: World): void {
    if (this.features.length >= MAX_FEATURES) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 8; attempt++) {
      if (this.features.length >= MAX_FEATURES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Geothermal features near mountains, lava, or sand
      if (tile !== TileType.MOUNTAIN && tile !== TileType.LAVA && tile !== TileType.SAND) continue
      if (Math.random() > SPAWN_CHANCE) continue

      // Not too close to existing
      if (this.features.some(f => Math.abs(f.x - x) < 6 && Math.abs(f.y - y) < 6)) continue

      const type = tile === TileType.LAVA
        ? (Math.random() < 0.5 ? 'fumarole' : 'geyser')
        : TYPES[Math.floor(Math.random() * TYPES.length)]

      const [minT, maxT] = TEMP_RANGE[type]

      this.features.push({
        id: this.nextId++,
        x, y,
        type,
        temperature: minT + Math.floor(Math.random() * (maxT - minT + 1)),
        activity: 30 + Math.floor(Math.random() * 50),
        lastEruption: 0,
        eruptionInterval: 500 + Math.floor(Math.random() * 1500),
        healRadius: type === 'hot_spring' ? 3 + Math.floor(Math.random() * 3) : 1,
      })
    }
  }

  private updateActivity(tick: number): void {
    for (const feature of this.features) {
      // Fluctuate activity
      feature.activity += (Math.random() - 0.5) * 10
      feature.activity = Math.max(5, Math.min(100, feature.activity))

      // Geysers erupt periodically
      if (feature.type === 'geyser' && tick - feature.lastEruption >= feature.eruptionInterval) {
        feature.lastEruption = tick
        feature.activity = 100
      }
    }
  }

  getFeatures(): GeothermalFeature[] { return this.features }
  getHotSprings(): GeothermalFeature[] { return this.features.filter(f => f.type === 'hot_spring') }
  getActiveGeysers(): GeothermalFeature[] { return this.features.filter(f => f.type === 'geyser' && f.activity > 80) }
  getFeatureCount(): number { return this.features.length }
}
