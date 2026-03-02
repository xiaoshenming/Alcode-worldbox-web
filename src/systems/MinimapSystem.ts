import { World } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import {
  EntityManager,
  PositionComponent,
} from '../ecs/Entity'
import { TileType, TILE_SIZE } from '../utils/Constants'

export type MinimapMode = 'terrain' | 'political' | 'population' | 'resources' | 'military'

// Terrain colors for minimap (one representative color per tile type)
const TERRAIN_COLORS: Record<number, string> = {
  [TileType.DEEP_WATER]: '#1a3a5c',
  [TileType.SHALLOW_WATER]: '#2a5a8c',
  [TileType.SAND]: '#c2b280',
  [TileType.GRASS]: '#3a8c3a',
  [TileType.FOREST]: '#1a5a1a',
  [TileType.MOUNTAIN]: '#6a6a7a',
  [TileType.SNOW]: '#f0f0f8',
  [TileType.LAVA]: '#ff4400',
}

const POPULATION_GRID_SIZE = 10 // cells per axis for density grid

export class MinimapSystem {
  private mode: MinimapMode = 'terrain'
  private _modeUpper = 'TERRAIN'
  private worldWidth: number
  private worldHeight: number

  // OffscreenCanvas cache
  private cache: OffscreenCanvas | null = null
  private cacheCtx: OffscreenCanvasRenderingContext2D | null = null
  private lastCacheWidth = 0
  private lastCacheHeight = 0
  private lastRedrawTick = -Infinity

  // Population density grid (reused between updates)
  private popGrid: number[][] = []
  private popGridRows = 0
  private popGridCols = 0

  constructor(width: number, height: number) {
    this.worldWidth = width
    this.worldHeight = height
  }

  setMode(mode: MinimapMode): void {
    // Force redraw when mode changes
    if (mode !== this.mode) {
      this.lastRedrawTick = -Infinity
    }
    this.mode = mode
    this._modeUpper = mode.toUpperCase()
  }

  getMode(): MinimapMode {
    return this.mode
  }

  update(world: World, civManager: CivManager, em: EntityManager, tick: number): void {
    // Only rebuild cache every 30 ticks
    if (tick - this.lastRedrawTick < 30) return
    this.lastRedrawTick = tick

    // Rebuild population grid for population / military modes
    if (this.mode === 'population' || this.mode === 'military') {
      this.buildPopulationGrid(em)
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    mapWidth: number,
    mapHeight: number,
    cameraX: number,
    cameraY: number,
    cameraZoom: number,
    viewportW: number,
    viewportH: number
  ): void {
    // Ensure offscreen cache exists at the right size
    this.ensureCache(mapWidth, mapHeight)
    if (!this.cacheCtx || !this.cache) return

    ctx.save()

    // Draw cached minimap image
    ctx.drawImage(this.cache, x, y, mapWidth, mapHeight)

    // Draw viewport rectangle
    const scaleX = mapWidth / (this.worldWidth * TILE_SIZE)
    const scaleY = mapHeight / (this.worldHeight * TILE_SIZE)

    const vpX = x + cameraX * scaleX
    const vpY = y + cameraY * scaleY
    const vpW = (viewportW / cameraZoom) * scaleX
    const vpH = (viewportH / cameraZoom) * scaleY

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.strokeRect(vpX, vpY, vpW, vpH)

    // Border around minimap
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, mapWidth, mapHeight)

    // Mode label
    ctx.globalAlpha = 0.7
    ctx.fillStyle = '#000000'
    ctx.fillRect(x, y, mapWidth, 14)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this._modeUpper, x + mapWidth / 2, y + 11)
    ctx.textAlign = 'start'

    ctx.restore()
  }

  // --- Private helpers ---

  private ensureCache(w: number, h: number): void {
    if (this.cache && this.lastCacheWidth === w && this.lastCacheHeight === h) return
    this.cache = new OffscreenCanvas(w, h)
    this.cacheCtx = this.cache.getContext('2d')
    this.lastCacheWidth = w
    this.lastCacheHeight = h
  }

  private buildPopulationGrid(em: EntityManager): void {
    this.popGridCols = POPULATION_GRID_SIZE
    this.popGridRows = POPULATION_GRID_SIZE

    // Reset grid
    if (this.popGrid.length !== this.popGridRows) {
      this.popGrid = []
      for (let r = 0; r < this.popGridRows; r++) {
        this.popGrid[r] = new Array(this.popGridCols).fill(0)
      }
    } else {
      for (let r = 0; r < this.popGridRows; r++) {
        this.popGrid[r].fill(0)
      }
    }

    const cellW = this.worldWidth / this.popGridCols
    const cellH = this.worldHeight / this.popGridRows

    const creatures = em.getEntitiesWithComponents('creature', 'position')
    for (const id of creatures) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const col = Math.min(Math.floor(pos.x / cellW), this.popGridCols - 1)
      const row = Math.min(Math.floor(pos.y / cellH), this.popGridRows - 1)
      if (col >= 0 && row >= 0) {
        this.popGrid[row][col]++
      }
    }
  }
}
