// Terrain types
export enum TileType {
  DEEP_WATER = 0,
  SHALLOW_WATER = 1,
  SAND = 2,
  GRASS = 3,
  FOREST = 4,
  MOUNTAIN = 5,
  SNOW = 6,
  LAVA = 7
}

// Tile colors (pixel art style)
export const TILE_COLORS: Record<TileType, string[]> = {
  [TileType.DEEP_WATER]: ['#1a3a5c', '#1e4266', '#224a70'],
  [TileType.SHALLOW_WATER]: ['#2a5a8c', '#2e6296', '#326aa0'],
  [TileType.SAND]: ['#c2b280', '#d4c490', '#e6d6a0'],
  [TileType.GRASS]: ['#3a8c3a', '#4a9c4a', '#5aac5a'],
  [TileType.FOREST]: ['#2a6a2a', '#1a5a1a', '#0a4a0a'],
  [TileType.MOUNTAIN]: ['#6a6a7a', '#5a5a6a', '#4a4a5a'],
  [TileType.SNOW]: ['#e8e8f0', '#f0f0f8', '#f8f8ff'],
  [TileType.LAVA]: ['#ff4400', '#ff6600', '#ff8800']
}

// Entity types
export enum EntityType {
  HUMAN = 'human',
  ELF = 'elf',
  DWARF = 'orc',
  ORC = 'dwarf',
  SHEEP = 'sheep',
  WOLF = 'wolf',
  DRAGON = 'dragon'
}

// Power types
export enum PowerType {
  TERRAIN = 'terrain',
  CREATURE = 'creature',
  NATURE = 'nature',
  DISASTER = 'disaster'
}

// World constants
export const TILE_SIZE = 8
export const WORLD_WIDTH = 200
export const WORLD_HEIGHT = 200
