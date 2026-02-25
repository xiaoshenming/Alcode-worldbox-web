import { TileType } from '../utils/Constants'

/** Height value for each tile type, used for downhill flow */
const TILE_HEIGHT: Record<TileType, number> = {
  [TileType.DEEP_WATER]: 0,
  [TileType.SHALLOW_WATER]: 1,
  [TileType.SAND]: 2,
  [TileType.GRASS]: 3,
  [TileType.FOREST]: 4,
  [TileType.MOUNTAIN]: 6,
  [TileType.SNOW]: 7,
  [TileType.LAVA]: 5,
}

const MIN_RIVERS = 3
const MAX_RIVERS = 8
const MIN_RIVER_LENGTH = 12

/** 8-directional neighbors */
const DIRS = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
]

export class RiverSystem {
  private rivers: Array<{ x: number; y: number }[]> = []
  private riverSet: Set<string> = new Set()

  private key(x: number, y: number): string {
    return `${x},${y}`
  }

  /**
   * Generate rivers on the world map. Call once during world creation.
   * Rivers start from high terrain (MOUNTAIN/SNOW) and flow downhill
   * until they reach water or get stuck.
   */
  generateRivers(tiles: TileType[][], width: number, height: number): void {
    this.rivers = []
    this.riverSet.clear()

    // Collect candidate source tiles (MOUNTAIN or SNOW)
    const sources: { x: number; y: number; h: number }[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y][x]
        if (t === TileType.MOUNTAIN || t === TileType.SNOW) {
          sources.push({ x, y, h: TILE_HEIGHT[t] })
        }
      }
    }

    if (sources.length === 0) return

    // Shuffle sources for variety
    this.shuffle(sources)

    // Sort by height descending so we prefer the highest peaks
    sources.sort((a, b) => b.h - a.h)

    const targetCount = MIN_RIVERS + Math.floor(Math.random() * (MAX_RIVERS - MIN_RIVERS + 1))

    for (const src of sources) {
      if (this.rivers.length >= targetCount) break
      const path = this.traceRiver(tiles, width, height, src.x, src.y)
      if (path.length >= MIN_RIVER_LENGTH) {
        this.applyRiver(tiles, width, height, path)
      }
    }
  }

  /** Trace a single river path downhill from (sx, sy) */
  private traceRiver(
    tiles: TileType[][],
    width: number,
    height: number,
    sx: number,
    sy: number,
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = []
    const visited = new Set<string>()
    let cx = sx
    let cy = sy

    while (true) {
      const k = this.key(cx, cy)
      if (visited.has(k)) break
      visited.add(k)

      // Stop if we reached existing water
      const current = tiles[cy][cx]
      if (current === TileType.DEEP_WATER || current === TileType.SHALLOW_WATER) {
        path.push({ x: cx, y: cy })
        break
      }

      // Skip if this tile is already part of another river (avoid overlap)
      if (this.riverSet.has(k) && path.length > 0) break

      path.push({ x: cx, y: cy })

      const currentH = TILE_HEIGHT[current]

      // Find the lowest neighbor
      let bestX = -1
      let bestY = -1
      let bestH = currentH

      for (const [dx, dy] of DIRS) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        if (visited.has(this.key(nx, ny))) continue

        const nh = TILE_HEIGHT[tiles[ny][nx]]
        if (nh < bestH || (nh === bestH && bestX === -1)) {
          // Prefer strictly lower; accept equal only if no lower found
          if (nh < bestH) {
            bestH = nh
            bestX = nx
            bestY = ny
          }
        }
      }

      // Dead end: no lower neighbor
      if (bestX === -1) break

      cx = bestX
      cy = bestY
    }

    return path
  }

  /** Apply a river path to the tile map and register it */
  private applyRiver(
    tiles: TileType[][],
    width: number,
    height: number,
    path: { x: number; y: number }[],
  ): void {
    this.rivers.push(path)

    for (const { x, y } of path) {
      this.riverSet.add(this.key(x, y))
      // Convert river tiles to shallow water (skip if already water)
      if (tiles[y][x] !== TileType.DEEP_WATER) {
        tiles[y][x] = TileType.SHALLOW_WATER
      }
    }

    // Fertilize banks: tiles adjacent to the river may become GRASS
    for (const { x, y } of path) {
      for (const [dx, dy] of DIRS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        if (this.riverSet.has(this.key(nx, ny))) continue

        const t = tiles[ny][nx]
        // Only convert SAND or FOREST to GRASS (fertilization effect)
        if ((t === TileType.SAND || t === TileType.FOREST) && Math.random() < 0.35) {
          tiles[ny][nx] = TileType.GRASS
        }
      }
    }
  }

  /** Fisher-Yates shuffle */
  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  /** Get all generated river paths */
  getRivers(): Array<{ x: number; y: number }[]> {
    return this.rivers
  }

  /** Check if a tile is part of a river */
  isRiverTile(x: number, y: number): boolean {
    return this.riverSet.has(this.key(x, y))
  }
}
