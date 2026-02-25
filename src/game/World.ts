import { TileType, TILE_COLORS, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Noise } from '../utils/Noise'

export class World {
  tiles: TileType[][] = []
  tileVariants: number[][] = [] // For color variation
  width: number
  height: number
  tick: number = 0
  dayNightCycle: number = 0.25 // 0-1, 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  private readonly dayLength: number = 3600 // ticks per full day

  constructor(width: number = WORLD_WIDTH, height: number = WORLD_HEIGHT) {
    this.width = width
    this.height = height
    this.generate()
  }

  generate(seed: number = Math.random() * 65536): void {
    const noise = new Noise(seed)
    const noise2 = new Noise(seed + 1000)

    this.tiles = []
    this.tileVariants = []

    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = []
      this.tileVariants[y] = []
      for (let x = 0; x < this.width; x++) {
        const nx = x / this.width * 4
        const ny = y / this.height * 4

        // Elevation noise
        const elevation = noise.fbm(nx, ny, 4)
        // Moisture for biome variation
        const moisture = noise2.fbm(nx * 2 + 100, ny * 2 + 100, 3)

        this.tiles[y][x] = this.getTileType(elevation, moisture)
        this.tileVariants[y][x] = Math.floor(Math.random() * 3)
      }
    }
  }

  private getTileType(elevation: number, moisture: number): TileType {
    // Deep water
    if (elevation < -0.4) return TileType.DEEP_WATER
    // Shallow water
    if (elevation < -0.2) return TileType.SHALLOW_WATER
    // Beach
    if (elevation < -0.1) return TileType.SAND
    // Snow peaks
    if (elevation > 0.6) return TileType.SNOW
    // Mountain
    if (elevation > 0.4) return TileType.MOUNTAIN
    // Forest (high moisture, mid elevation)
    if (elevation > 0.1 && moisture > 0.2) return TileType.FOREST
    // Grass
    if (elevation > -0.1) return TileType.GRASS
    // Default
    return TileType.GRASS
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = type
      this.tileVariants[y][x] = Math.floor(Math.random() * 3)
    }
  }

  getTile(x: number, y: number): TileType | null {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.tiles[y][x]
    }
    return null
  }

  getColor(x: number, y: number): string {
    const tile = this.getTile(x, y)
    if (tile === null) return '#000'
    const variant = this.tileVariants[y]?.[x] ?? 0
    return TILE_COLORS[tile][variant]
  }

  update(): void {
    this.tick++
    this.dayNightCycle = (this.tick % this.dayLength) / this.dayLength
  }

  // Returns brightness multiplier: 1.0 = full day, 0.3 = night
  getDayBrightness(): number {
    // Map cycle to brightness using sine curve
    // 0.5 (noon) = brightest, 0.0 (midnight) = darkest
    const angle = this.dayNightCycle * Math.PI * 2
    const raw = Math.sin(angle - Math.PI / 2) // -1 at midnight, +1 at noon
    return 0.3 + (raw + 1) * 0.35 // range: 0.3 to 1.0
  }

  isDay(): boolean {
    return this.dayNightCycle > 0.2 && this.dayNightCycle < 0.8
  }
}
