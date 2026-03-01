import { TileType, TILE_SIZE } from '../utils/Constants'

export enum DecorationType {
  FLOWER_RED, FLOWER_YELLOW, FLOWER_WHITE,
  GRASS_TUFT, MUSHROOM, FALLEN_LEAF,
  SHELL, CACTUS, SMALL_ROCK, ORE_SPARKLE,
  SNOWFLAKE, ICE_CRYSTAL
}

export interface Decoration {
  x: number
  y: number
  type: DecorationType
  offsetX: number // tile内偏移 0-7
  offsetY: number
}

// 基于坐标的确定性伪随机
function seededRandom(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0
  h = ((h ^ (h >> 13)) * 1274126177) | 0
  h = (h ^ (h >> 16)) | 0
  return (h & 0x7fffffff) / 0x7fffffff
}

// 地形 -> 可用装饰类型映射
const TERRAIN_DECORATIONS: Partial<Record<TileType, DecorationType[]>> = {
  [TileType.GRASS]: [DecorationType.FLOWER_RED, DecorationType.FLOWER_YELLOW, DecorationType.FLOWER_WHITE, DecorationType.GRASS_TUFT],
  [TileType.FOREST]: [DecorationType.MUSHROOM, DecorationType.FALLEN_LEAF],
  [TileType.SAND]: [DecorationType.SHELL, DecorationType.CACTUS],
  [TileType.MOUNTAIN]: [DecorationType.SMALL_ROCK, DecorationType.ORE_SPARKLE],
  [TileType.SNOW]: [DecorationType.SNOWFLAKE, DecorationType.ICE_CRYSTAL],
}

// 装饰物渲染函数表
type RenderFn = (ctx: CanvasRenderingContext2D, px: number, py: number) => void

const RENDER_MAP: Record<DecorationType, RenderFn> = {
  [DecorationType.FLOWER_RED](ctx, px, py) {
    ctx.fillStyle = '#2d7a2d'; ctx.fillRect(px + 1, py + 2, 1, 2) // 茎
    ctx.fillStyle = '#e83030'; ctx.fillRect(px, py, 2, 2)          // 花
  },
  [DecorationType.FLOWER_YELLOW](ctx, px, py) {
    ctx.fillStyle = '#2d7a2d'; ctx.fillRect(px + 1, py + 2, 1, 2)
    ctx.fillStyle = '#e8d830'; ctx.fillRect(px, py, 2, 2)
  },
  [DecorationType.FLOWER_WHITE](ctx, px, py) {
    ctx.fillStyle = '#2d7a2d'; ctx.fillRect(px + 1, py + 2, 1, 2)
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(px, py, 2, 2)
  },
  [DecorationType.GRASS_TUFT](ctx, px, py) {
    ctx.fillStyle = '#3aaa3a'
    ctx.fillRect(px, py + 1, 1, 3)     // 左
    ctx.fillRect(px + 1, py, 1, 2)     // 中
    ctx.fillRect(px + 2, py + 1, 1, 3) // 右
  },
  [DecorationType.MUSHROOM](ctx, px, py) {
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(px + 1, py + 2, 1, 1) // 白茎
    ctx.fillStyle = '#cc2222'; ctx.fillRect(px, py, 2, 2)          // 红帽
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(px + 1, py, 1, 1)     // 白点
  },
  [DecorationType.FALLEN_LEAF](ctx, px, py) {
    ctx.fillStyle = '#b87830'; ctx.fillRect(px, py, 2, 1)
    ctx.fillStyle = '#a06828'; ctx.fillRect(px + 1, py + 1, 1, 1)
  },
  [DecorationType.SHELL](ctx, px, py) {
    ctx.fillStyle = '#e8b0c0'; ctx.fillRect(px, py + 1, 2, 1)
    ctx.fillStyle = '#d898a8'; ctx.fillRect(px, py, 1, 1)
    ctx.fillStyle = '#f0c0d0'; ctx.fillRect(px + 1, py, 1, 1)
  },
  [DecorationType.CACTUS](ctx, px, py) {
    ctx.fillStyle = '#2a8a2a'; ctx.fillRect(px + 1, py, 1, 4) // 主干
    ctx.fillRect(px, py + 1, 1, 1)                             // 左臂
    ctx.fillRect(px + 2, py + 2, 1, 1)                         // 右臂
  },
  [DecorationType.SMALL_ROCK](ctx, px, py) {
    ctx.fillStyle = '#888898'; ctx.fillRect(px, py, 2, 2)
    ctx.fillStyle = '#9898a8'; ctx.fillRect(px, py, 1, 1) // 高光
  },
  [DecorationType.ORE_SPARKLE](ctx, px, py) {
    ctx.fillStyle = '#707080'; ctx.fillRect(px, py, 2, 2)
    ctx.fillStyle = '#e8d850'; ctx.fillRect(px + 1, py, 1, 1) // 闪光
  },
  [DecorationType.SNOWFLAKE](ctx, px, py) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(px + 1, py, 1, 3)     // 竖
    ctx.fillRect(px, py + 1, 3, 1)     // 横
  },
  [DecorationType.ICE_CRYSTAL](ctx, px, py) {
    ctx.fillStyle = '#c0e0ff'; ctx.fillRect(px, py, 2, 2)
    ctx.fillStyle = '#e0f0ff'; ctx.fillRect(px + 1, py, 1, 1) // 亮角
  },
}

export class WorldDecorationSystem {
  private grid: (Decoration | null)[][] = []
  private worldWidth: number = 0
  private worldHeight: number = 0
  private decorationCount: number = 0

  generate(tiles: TileType[][], width: number, height: number): void {
    this.worldWidth = width
    this.worldHeight = height
    this.decorationCount = 0
    this.grid = new Array(height)
    for (let y = 0; y < height; y++) {
      this.grid[y] = new Array(width).fill(null)
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x]
        const candidates = TERRAIN_DECORATIONS[tile]
        if (!candidates) continue

        const r = seededRandom(x, y, 42)
        // 覆盖率 ~20%
        if (r > 0.20) continue

        const typeIdx = Math.floor(seededRandom(x, y, 137) * candidates.length)
        const type = candidates[Math.min(typeIdx, candidates.length - 1)]
        const offsetX = Math.floor(seededRandom(x, y, 251) * (TILE_SIZE - 3)) + 1
        const offsetY = Math.floor(seededRandom(x, y, 389) * (TILE_SIZE - 4)) + 1

        this.grid[y][x] = { x, y, type, offsetX, offsetY }
        this.decorationCount++
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number, cameraY: number, zoom: number,
    minTileX: number, minTileY: number,
    maxTileX: number, maxTileY: number
  ): void {
    // 缩放过小时跳过装饰渲染
    if (zoom < 0.5) return

    const x0 = Math.max(0, minTileX)
    const y0 = Math.max(0, minTileY)
    const x1 = Math.min(this.worldWidth - 1, maxTileX)
    const y1 = Math.min(this.worldHeight - 1, maxTileY)

    ctx.save()
    ctx.scale(zoom, zoom)
    for (let y = y0; y <= y1; y++) {
      const row = this.grid[y]
      if (!row) continue
      for (let x = x0; x <= x1; x++) {
        const d = row[x]
        if (!d) continue
        const sx = d.x * TILE_SIZE + d.offsetX - cameraX
        const sy = d.y * TILE_SIZE + d.offsetY - cameraY
        RENDER_MAP[d.type](ctx, sx, sy)
      }
    }
    ctx.restore()
  }

  get count(): number {
    return this.decorationCount
  }
}
