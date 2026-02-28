import { TileType, TILE_COLORS, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Noise } from '../utils/Noise'
import { EventLog } from '../systems/EventLog'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** Pre-computed season order — avoids per-tick literal array creation in update() */
const _SEASON_ORDER: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'] as const
/** Pre-computed season display names — avoids per-season-change Record creation in update() */
const _SEASON_NAMES: Record<Season, string> = {
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter'
}

export class World {
  tiles: TileType[][] = []
  tileVariants: number[][] = [] // For color variation
  width: number
  height: number
  tick: number = 0
  dayNightCycle: number = 0.25 // 0-1, 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
  private readonly dayLength: number = 3600 // ticks per full day

  // Season system
  season: Season = 'spring'
  seasonProgress: number = 0 // 0-1 progress within current season
  yearTick: number = 0
  private readonly seasonLength: number = 7200 // ticks per season (2 day-night cycles)
  private readonly yearLength: number = 7200 * 4 // full year
  private lastSeason: Season = 'spring' // track season changes for dirty marking

  // Precomputed color cache: key = `${tile}_${variant}_${season}`, max ~96 entries
  private _colorCache: Map<string, string> = new Map()

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
    this._fullDirty = true
    this.dirtyRegions.clear()

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

  // Dirty region tracking for render optimization
  private dirtyRegions: Set<string> = new Set()
  private _fullDirty: boolean = true

  markFullDirty(): void {
    this._fullDirty = true
  }

  isFullDirty(): boolean {
    return this._fullDirty
  }

  clearDirty(): void {
    this._fullDirty = false
    this.dirtyRegions.clear()
  }

  isDirty(): boolean {
    return this._fullDirty || this.dirtyRegions.size > 0
  }

  getDirtyRegions(): Set<string> {
    return this.dirtyRegions
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = type
      this.tileVariants[y][x] = Math.floor(Math.random() * 3)
      // Mark 16x16 chunk as dirty
      const cx = Math.floor(x / 16)
      const cy = Math.floor(y / 16)
      this.dirtyRegions.add(`${cx},${cy}`)
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

    // Check cache first (max ~96 combinations: 8 tiles × 3 variants × 4 seasons)
    const cacheKey = `${tile}_${variant}_${this.season}`
    const cached = this._colorCache.get(cacheKey)
    if (cached !== undefined) return cached

    const base = TILE_COLORS[tile][variant]

    // Summer: no tint
    if (this.season === 'summer') {
      this._colorCache.set(cacheKey, base)
      return base
    }

    let tint: string | null = null
    let alpha: number = 0

    if (this.season === 'spring') {
      if (tile === TileType.GRASS) { tint = '#88ff88'; alpha = 0.15 }
      else if (tile === TileType.FOREST) { tint = '#66ee66'; alpha = 0.12 }
    } else if (this.season === 'autumn') {
      if (tile === TileType.FOREST) { tint = '#dd4422'; alpha = 0.3 }
      else if (tile === TileType.GRASS) { tint = '#cc8833'; alpha = 0.25 }
      else if (tile === TileType.SAND) { tint = '#bb9944'; alpha = 0.1 }
    } else {
      // winter
      if (tile === TileType.GRASS) { tint = '#ccddee'; alpha = 0.25 }
      else if (tile === TileType.FOREST) { tint = '#aabbcc'; alpha = 0.2 }
      else if (tile === TileType.SAND) { tint = '#dde0e4'; alpha = 0.15 }
      else if (tile === TileType.DEEP_WATER) { tint = '#0a1a2c'; alpha = 0.2 }
      else if (tile === TileType.SHALLOW_WATER) { tint = '#1a3050'; alpha = 0.15 }
      else if (tile === TileType.MOUNTAIN) { tint = '#dde4ee'; alpha = 0.15 }
    }

    const result = tint ? this.blendColors(base, tint, alpha) : base
    this._colorCache.set(cacheKey, result)
    return result
  }

  private blendColors(base: string, tint: string, alpha: number): string {
    const br = parseInt(base.slice(1, 3), 16)
    const bg = parseInt(base.slice(3, 5), 16)
    const bb = parseInt(base.slice(5, 7), 16)
    const tr = parseInt(tint.slice(1, 3), 16)
    const tg = parseInt(tint.slice(3, 5), 16)
    const tb = parseInt(tint.slice(5, 7), 16)
    const r = Math.round(br + (tr - br) * alpha)
    const g = Math.round(bg + (tg - bg) * alpha)
    const b = Math.round(bb + (tb - bb) * alpha)
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  }

  getSeason(): Season {
    return this.season
  }

  getSeasonMultiplier(): number {
    switch (this.season) {
      case 'spring': return 1.1
      case 'summer': return 1.0
      case 'autumn': return 0.9
      case 'winter': return 0.7
    }
  }

  update(): void {
    this.tick++
    this.dayNightCycle = (this.tick % this.dayLength) / this.dayLength

    // Season tracking
    this.yearTick = this.tick % this.yearLength
    const seasonIndex = Math.floor(this.yearTick / this.seasonLength)
    this.season = _SEASON_ORDER[seasonIndex]
    this.seasonProgress = (this.yearTick % this.seasonLength) / this.seasonLength

    // Mark world dirty when season changes so tiles re-render with new tint
    if (this.season !== this.lastSeason) {
      EventLog.log('weather', `Season changed to ${_SEASON_NAMES[this.season]}`, this.tick)
      this.lastSeason = this.season
      this._fullDirty = true
      this._colorCache.clear()
    }
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
