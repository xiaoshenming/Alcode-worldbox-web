import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Noise } from '../utils/Noise'
import { EventLog } from './EventLog'

export enum OreType {
  NONE = 0,
  COPPER = 1,
  IRON = 2,
  GOLD = 3,
  GEMS = 4,
  MITHRIL = 5,
  ADAMANTINE = 6
}

export interface OreDeposit {
  x: number
  y: number
  type: OreType
  size: 'small' | 'medium' | 'large'
  reserves: number
  maxReserves: number
  discovered: boolean
  discoveredBy: number | null
  mineBuilt: boolean
  productionRate: number
}

interface CivData {
  id: number
  cities: { x: number; y: number }[]
  techLevel: number
  race: string
}

const ORE_NAMES: Record<OreType, string> = {
  [OreType.NONE]: '',
  [OreType.COPPER]: 'Copper',
  [OreType.IRON]: 'Iron',
  [OreType.GOLD]: 'Gold',
  [OreType.GEMS]: 'Gems',
  [OreType.MITHRIL]: 'Mithril',
  [OreType.ADAMANTINE]: 'Adamantine'
}

// Rarity thresholds for noise-based generation (higher = rarer)
const ORE_THRESHOLDS: Record<OreType, number> = {
  [OreType.NONE]: 0,
  [OreType.COPPER]: 0.25,
  [OreType.IRON]: 0.35,
  [OreType.GOLD]: 0.50,
  [OreType.GEMS]: 0.60,
  [OreType.MITHRIL]: 0.72,
  [OreType.ADAMANTINE]: 0.82
}

const SIZE_RESERVES: Record<string, number> = {
  small: 50,
  medium: 120,
  large: 250
}

// Terrain multiplier for ore spawn probability
function terrainOreMultiplier(tile: TileType): number {
  switch (tile) {
    case TileType.MOUNTAIN: return 3.0
    case TileType.SNOW: return 2.0
    case TileType.FOREST: return 1.2
    case TileType.GRASS: return 1.0
    case TileType.SAND: return 0.5
    case TileType.LAVA: return 1.5
    case TileType.DEEP_WATER:
    case TileType.SHALLOW_WATER: return 0
    default: return 0
  }
}

export class MiningSystem {
  private oreMap: OreType[][] = []
  private deposits: OreDeposit[] = []
  private readonly WORLD_W = WORLD_WIDTH
  private readonly WORLD_H = WORLD_HEIGHT

  constructor() {
    // Initialize empty ore map
    for (let y = 0; y < this.WORLD_H; y++) {
      this.oreMap[y] = new Array(this.WORLD_W).fill(OreType.NONE)
    }
  }

  generateOreMap(worldTiles: number[][]): void {
    const seed = Math.random() * 65536
    const noiseCopper = new Noise(seed)
    const noiseIron = new Noise(seed + 100)
    const noiseGold = new Noise(seed + 200)
    const noiseGems = new Noise(seed + 300)
    const noiseMithril = new Noise(seed + 400)
    const noiseAdamantine = new Noise(seed + 500)
    const noiseSize = new Noise(seed + 600)

    this.deposits = []
    for (let y = 0; y < this.WORLD_H; y++) {
      this.oreMap[y] = new Array(this.WORLD_W).fill(OreType.NONE)
    }

    const oreNoises: { type: OreType; noise: Noise; scale: number }[] = [
      { type: OreType.COPPER, noise: noiseCopper, scale: 6 },
      { type: OreType.IRON, noise: noiseIron, scale: 7 },
      { type: OreType.GOLD, noise: noiseGold, scale: 8 },
      { type: OreType.GEMS, noise: noiseGems, scale: 9 },
      { type: OreType.MITHRIL, noise: noiseMithril, scale: 10 },
      { type: OreType.ADAMANTINE, noise: noiseAdamantine, scale: 11 }
    ]

    for (let y = 0; y < this.WORLD_H; y++) {
      for (let x = 0; x < this.WORLD_W; x++) {
        const tile = worldTiles[y]?.[x] as TileType
        const tMult = terrainOreMultiplier(tile)
        if (tMult === 0) continue

        // Evaluate each ore type from rarest to most common
        // Rarer ores override common ones at the same tile
        let bestOre = OreType.NONE
        for (const { type, noise, scale } of oreNoises) {
          const nx = x / this.WORLD_W * scale
          const ny = y / this.WORLD_H * scale
          const val = (noise.fbm(nx, ny, 3) + 1) * 0.5 // normalize to 0-1
          const threshold = ORE_THRESHOLDS[type]
          if (val * tMult > threshold + 0.5) {
            bestOre = type
          }
        }

        if (bestOre !== OreType.NONE) {
          this.oreMap[y][x] = bestOre

          // Only create deposit nodes at cluster centers (sparse sampling)
          // Check if this is a local peak to avoid too many deposits
          if (this.isLocalPeak(x, y, bestOre)) {
            const sizeVal = (noiseSize.fbm(x * 0.1, y * 0.1, 2) + 1) * 0.5
            const size: 'small' | 'medium' | 'large' =
              sizeVal > 0.7 ? 'large' : sizeVal > 0.4 ? 'medium' : 'small'
            const maxReserves = SIZE_RESERVES[size]

            this.deposits.push({
              x, y,
              type: bestOre,
              size,
              reserves: maxReserves,
              maxReserves,
              discovered: false,
              discoveredBy: null,
              mineBuilt: false,
              productionRate: 0
            })
          }
        }
      }
    }
  }

  /** Check if (x,y) is a local peak for the given ore type in a 5x5 area */
  private isLocalPeak(x: number, y: number, ore: OreType): boolean {
    let count = 0
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= this.WORLD_W || ny < 0 || ny >= this.WORLD_H) continue
        if (this.oreMap[ny][nx] === ore) count++
      }
    }
    // Only create deposit if this tile has enough neighbors of same ore
    // and is roughly the center (use coordinate hash to pick one per cluster)
    return count >= 4 && ((x * 7 + y * 13) % 5 === 0)
  }

  update(
    tick: number,
    civData: CivData[]
  ): void {
    // Only process every 60 ticks
    if (tick % 60 !== 0) return

    for (const civ of civData) {
      // Try discovering ores near cities
      for (const city of civ.cities) {
        const searchRadius = 8 + civ.techLevel * 3
        for (const dep of this.deposits) {
          if (dep.discovered) continue
          const dx = dep.x - city.x
          const dy = dep.y - city.y
          if (dx * dx + dy * dy <= searchRadius * searchRadius) {
            this.tryDiscoverOre(civ.id, dep.x, dep.y, civ.techLevel, civ.race)
          }
        }
      }

      // Produce resources from active mines
      for (const dep of this.deposits) {
        if (!dep.mineBuilt || dep.reserves <= 0) continue
        if (dep.discoveredBy !== civ.id) continue

        const baseRate = dep.size === 'large' ? 3 : dep.size === 'medium' ? 2 : 1
        const techMult = 1 + civ.techLevel * 0.2
        const raceMult = this.getRaceMiningMult(civ.race, dep.type)
        dep.productionRate = baseRate * techMult * raceMult

        dep.reserves = Math.max(0, dep.reserves - dep.productionRate)

        if (dep.reserves <= 0) {
          EventLog.log('trade',
            `${ORE_NAMES[dep.type]} mine at (${dep.x},${dep.y}) has been depleted`, tick)
        }
      }
    }
  }

  private getRaceMiningMult(race: string, ore: OreType): number {
    if (race === 'dwarf') {
      if (ore === OreType.ADAMANTINE) return 2.0
      return 1.5 // dwarves are natural miners
    }
    if (race === 'elf' && ore === OreType.MITHRIL) return 1.8
    if (race === 'orc') return 1.2 // brute force mining
    return 1.0
  }

  tryDiscoverOre(
    civId: number,
    x: number,
    y: number,
    techLevel: number,
    race: string
  ): OreDeposit | null {
    if (x < 0 || x >= this.WORLD_W || y < 0 || y >= this.WORLD_H) return null

    const deposit = this.deposits.find(d => d.x === x && d.y === y && !d.discovered)
    if (!deposit) return null

    // Base discovery chance scales with tech level
    let chance = 0.02 + techLevel * 0.03

    // Dwarves have natural prospecting bonus
    if (race === 'dwarf') chance *= 2.0

    // Rarer ores are harder to find
    chance /= (deposit.type * 0.5 + 0.5)

    if (Math.random() < chance) {
      deposit.discovered = true
      deposit.discoveredBy = civId
      EventLog.log('trade',
        `Discovered ${ORE_NAMES[deposit.type]} deposit (${deposit.size}) at (${x},${y})!`, 0)
      return deposit
    }
    return null
  }

  buildMine(civId: number, deposit: OreDeposit): boolean {
    if (!deposit.discovered || deposit.discoveredBy !== civId) return false
    if (deposit.mineBuilt) return false
    if (deposit.reserves <= 0) return false

    deposit.mineBuilt = true
    EventLog.log('trade',
      `Mine built on ${ORE_NAMES[deposit.type]} deposit at (${deposit.x},${deposit.y})`, 0)
    return true
  }

  getDepositsForCiv(civId: number): OreDeposit[] {
    return this.deposits.filter(d => d.discoveredBy === civId)
  }

  getOreAt(x: number, y: number): OreType {
    if (x < 0 || x >= this.WORLD_W || y < 0 || y >= this.WORLD_H) return OreType.NONE
    return this.oreMap[y][x]
  }

  getOreMap(): OreType[][] {
    return this.oreMap
  }

  getDiscoveredDeposits(): OreDeposit[] {
    return this.deposits.filter(d => d.discovered)
  }

  getMiningBonus(oreType: OreType): { military: number; wealth: number; culture: number } {
    switch (oreType) {
      case OreType.COPPER:
        return { military: 5, wealth: 2, culture: 0 }
      case OreType.IRON:
        return { military: 10, wealth: 3, culture: 0 }
      case OreType.GOLD:
        return { military: 0, wealth: 15, culture: 2 }
      case OreType.GEMS:
        return { military: 0, wealth: 8, culture: 12 }
      case OreType.MITHRIL:
        return { military: 20, wealth: 10, culture: 5 }
      case OreType.ADAMANTINE:
        return { military: 25, wealth: 12, culture: 3 }
      default:
        return { military: 0, wealth: 0, culture: 0 }
    }
  }
}
