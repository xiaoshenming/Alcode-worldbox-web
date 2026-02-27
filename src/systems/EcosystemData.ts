// Ecosystem data definitions - wildlife rules and constants
// Extracted from EcosystemSystem.ts for file size management

import { TileType } from '../utils/Constants'

export type WildlifeType = 'deer' | 'bear' | 'fish' | 'eagle' | 'snake' | 'rabbit' | 'boar' | 'fox'

export interface WildlifeSpawnRule {
  species: WildlifeType
  biome: number[]
  spawnChance: number
  maxPerBiome: number
  predator: boolean
  prey: string[]
  fleeFrom: string[]
  speed: number
  damage: number
  color: string
  size: number
}

export const WILDLIFE_RULES: WildlifeSpawnRule[] = [
  {
    species: 'deer',
    biome: [TileType.GRASS, TileType.FOREST],
    spawnChance: 0.0001,
    maxPerBiome: 4,
    predator: false,
    prey: [],
    fleeFrom: ['wolf', 'bear', 'human', 'orc', 'fox'],
    speed: 1.2,
    damage: 2,
    color: '#c4a060',
    size: 3
  },
  {
    species: 'bear',
    biome: [TileType.FOREST, TileType.MOUNTAIN],
    spawnChance: 0.0001,
    maxPerBiome: 2,
    predator: true,
    prey: ['deer', 'sheep', 'fish'],
    fleeFrom: ['dragon'],
    speed: 0.8,
    damage: 15,
    color: '#6a4a2a',
    size: 5
  },
  {
    species: 'fish',
    biome: [TileType.SHALLOW_WATER],
    spawnChance: 0.0001,
    maxPerBiome: 6,
    predator: false,
    prey: [],
    fleeFrom: ['bear', 'eagle'],
    speed: 0.6,
    damage: 0,
    color: '#88aacc',
    size: 2
  },
  {
    species: 'eagle',
    biome: [TileType.MOUNTAIN, TileType.FOREST],
    spawnChance: 0.0001,
    maxPerBiome: 2,
    predator: true,
    prey: ['rabbit', 'snake', 'fish'],
    fleeFrom: ['dragon'],
    speed: 2.0,
    damage: 8,
    color: '#8a7a5a',
    size: 3
  },
  {
    species: 'snake',
    biome: [TileType.SAND, TileType.GRASS],
    spawnChance: 0.0001,
    maxPerBiome: 3,
    predator: true,
    prey: ['rabbit'],
    fleeFrom: ['eagle', 'boar', 'human'],
    speed: 0.7,
    damage: 5,
    color: '#5a8a3a',
    size: 2
  },
  {
    species: 'rabbit',
    biome: [TileType.GRASS],
    spawnChance: 0.0001,
    maxPerBiome: 5,
    predator: false,
    prey: [],
    fleeFrom: ['wolf', 'fox', 'eagle', 'snake', 'bear', 'human', 'orc', 'boar'],
    speed: 1.5,
    damage: 0,
    color: '#ccbb99',
    size: 2
  },
  {
    species: 'boar',
    biome: [TileType.FOREST],
    spawnChance: 0.0001,
    maxPerBiome: 3,
    predator: false,
    prey: [],
    fleeFrom: ['bear', 'wolf', 'dragon'],
    speed: 0.9,
    damage: 10,
    color: '#7a5a3a',
    size: 4
  },
  {
    species: 'fox',
    biome: [TileType.GRASS, TileType.FOREST],
    spawnChance: 0.0001,
    maxPerBiome: 3,
    predator: true,
    prey: ['rabbit', 'fish'],
    fleeFrom: ['wolf', 'bear', 'eagle', 'human'],
    speed: 1.3,
    damage: 6,
    color: '#cc7733',
    size: 3
  }
]

export const MAX_WILDLIFE = 200
export const SPAWN_INTERVAL = 100
export const HUNT_RANGE = 8
export const FLEE_RANGE = 10
export const AREA_CHECK_SIZE = 20
export const MAX_AGE_WILDLIFE: Record<WildlifeType, [number, number]> = {
  deer: [400, 700],
  bear: [600, 1000],
  fish: [200, 400],
  eagle: [500, 800],
  snake: [300, 500],
  rabbit: [200, 350],
  boar: [400, 650],
  fox: [350, 550]
}
