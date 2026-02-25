// World Fossil System (v2.67) - Ancient fossils buried in terrain
// Fossils spawn in mountain, rock, and sand terrain, discoverable by nearby creatures
// Discovered fossils increase civilization knowledge

import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type FossilType = 'bone' | 'shell' | 'plant' | 'amber' | 'footprint' | 'artifact'
export type FossilAge = 'ancient' | 'old' | 'recent'
export type FossilRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface Fossil {
  id: number
  x: number
  y: number
  type: FossilType
  age: FossilAge
  rarity: FossilRarity
  discovered: boolean
  discoveredTick: number
}

const CHECK_INTERVAL = 1200
const MAX_FOSSILS = 50
const SPAWN_CHANCE = 0.006
const DISCOVERY_CHANCE = 0.03

const FOSSIL_TYPES: FossilType[] = ['bone', 'shell', 'plant', 'amber', 'footprint', 'artifact']
const AGES: FossilAge[] = ['ancient', 'old', 'recent']
const RARITIES: FossilRarity[] = ['common', 'uncommon', 'rare', 'legendary']
const RARITY_WEIGHTS = [0.5, 0.3, 0.15, 0.05]

const KNOWLEDGE_BY_RARITY: Record<FossilRarity, number> = {
  common: 2,
  uncommon: 5,
  rare: 12,
  legendary: 30,
}

const VALID_TERRAIN = new Set([TileType.MOUNTAIN, TileType.SAND, TileType.SNOW])

function pickRarity(): FossilRarity {
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < RARITY_WEIGHTS.length; i++) {
    cumulative += RARITY_WEIGHTS[i]
    if (r < cumulative) return RARITIES[i]
  }
  return 'common'
}

export class WorldFossilSystem {
  private fossils: Fossil[] = []
  private nextId = 1
  private lastCheck = 0
  /** Accumulated knowledge from discovered fossils */
  private totalKnowledge = 0

  update(dt: number, world: World, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.spawnFossils(world)
    this.tryDiscoveries(world, tick)
  }

  private spawnFossils(world: World): void {
    if (this.fossils.length >= MAX_FOSSILS) return
    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 5; attempt++) {
      if (this.fossils.length >= MAX_FOSSILS) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === null || !VALID_TERRAIN.has(tile)) continue
      if (Math.random() > SPAWN_CHANCE) continue
      if (this.fossils.some(f => f.x === x && f.y === y)) continue

      this.fossils.push({
        id: this.nextId++,
        x, y,
        type: FOSSIL_TYPES[Math.floor(Math.random() * FOSSIL_TYPES.length)],
        age: AGES[Math.floor(Math.random() * AGES.length)],
        rarity: pickRarity(),
        discovered: false,
        discoveredTick: 0,
      })
    }
  }

  private tryDiscoveries(world: World, tick: number): void {
    for (const fossil of this.fossils) {
      if (fossil.discovered) continue
      // Simulate creature proximity via random chance per check
      if (Math.random() < DISCOVERY_CHANCE) {
        fossil.discovered = true
        fossil.discoveredTick = tick
        this.totalKnowledge += KNOWLEDGE_BY_RARITY[fossil.rarity]
      }
    }
  }

  getFossils(): Fossil[] { return this.fossils }
  getFossilCount(): number { return this.fossils.length }
  getDiscoveredFossils(): Fossil[] { return this.fossils.filter(f => f.discovered) }
  getFossilAt(x: number, y: number): Fossil | undefined { return this.fossils.find(f => f.x === x && f.y === y) }
  getTotalKnowledge(): number { return this.totalKnowledge }
}
