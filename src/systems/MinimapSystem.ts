import { World } from '../game/World'
import { CivManager } from '../civilization/CivManager'
import {
  EntityManager,
  PositionComponent,
  AIComponent,
} from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { TileType, TILE_SIZE } from '../utils/Constants'

export type MinimapMode = 'terrain' | 'political' | 'population' | 'resources' | 'military'

// Pre-computed heatmap color table: green→red gradient (t from 0.00 to 1.00, step 0.01)
const HEATMAP_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const t = i / 100
    cols.push(`rgb(${Math.floor(255 * t)},${Math.floor(255 * (1 - t))},0)`)
  }
  return cols
})()

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
    ctx.fillText(this.mode.toUpperCase(), x + mapWidth / 2, y + 11)
    ctx.textAlign = 'start'

    ctx.restore()
  }

  /**
   * Rebuild the offscreen cache with current mode data.
   * Called from render() — the actual heavy work only happens every 30 ticks
   * because update() gates lastRedrawTick.
   */
  renderToCache(
    world: World,
    civManager: CivManager,
    em: EntityManager,
    mapWidth: number,
    mapHeight: number
  ): void {
    this.ensureCache(mapWidth, mapHeight)
    const c = this.cacheCtx
    if (!c) return

    c.clearRect(0, 0, mapWidth, mapHeight)

    // Always draw terrain base
    this.drawTerrain(c, world, mapWidth, mapHeight)

    switch (this.mode) {
      case 'terrain':
        // terrain-only, already drawn
        break
      case 'political':
        this.drawPolitical(c, civManager, mapWidth, mapHeight)
        break
      case 'population':
        this.drawPopulation(c, mapWidth, mapHeight)
        break
      case 'resources':
        this.drawResources(c, world, mapWidth, mapHeight)
        break
      case 'military':
        this.drawMilitary(c, em, civManager, mapWidth, mapHeight)
        break
    }
  }

  handleClick(
    clickX: number,
    clickY: number,
    mapX: number,
    mapY: number,
    mapWidth: number,
    mapHeight: number
  ): { worldX: number; worldY: number } | null {
    const relX = clickX - mapX
    const relY = clickY - mapY

    if (relX < 0 || relX >= mapWidth || relY < 0 || relY >= mapHeight) {
      return null
    }

    const worldX = (relX / mapWidth) * this.worldWidth * TILE_SIZE
    const worldY = (relY / mapHeight) * this.worldHeight * TILE_SIZE

    return { worldX, worldY }
  }

  // --- Private rendering helpers ---

  private ensureCache(w: number, h: number): void {
    if (this.cache && this.lastCacheWidth === w && this.lastCacheHeight === h) return
    this.cache = new OffscreenCanvas(w, h)
    this.cacheCtx = this.cache.getContext('2d')!
    this.lastCacheWidth = w
    this.lastCacheHeight = h
  }

  private drawTerrain(
    ctx: OffscreenCanvasRenderingContext2D,
    world: World,
    w: number,
    h: number
  ): void {
    const scaleX = w / this.worldWidth
    const scaleY = h / this.worldHeight
    const pw = Math.ceil(scaleX) || 1
    const ph = Math.ceil(scaleY) || 1

    for (let ty = 0; ty < this.worldHeight; ty++) {
      for (let tx = 0; tx < this.worldWidth; tx++) {
        const tile = world.tiles[ty]?.[tx]
        if (tile === undefined) continue
        ctx.fillStyle = TERRAIN_COLORS[tile] ?? '#000000'
        ctx.fillRect(Math.floor(tx * scaleX), Math.floor(ty * scaleY), pw, ph)
      }
    }
  }

  private drawPolitical(
    ctx: OffscreenCanvasRenderingContext2D,
    civManager: CivManager,
    w: number,
    h: number
  ): void {
    const scaleX = w / this.worldWidth
    const scaleY = h / this.worldHeight
    const pw = Math.ceil(scaleX) || 1
    const ph = Math.ceil(scaleY) || 1

    ctx.globalAlpha = 0.45
    for (const [, civ] of civManager.civilizations) {
      ctx.fillStyle = civ.color
      for (const key of civ.territory) {
        const commaIdx = key.indexOf(',')
        const tx = parseInt(key.substring(0, commaIdx), 10)
        const ty = parseInt(key.substring(commaIdx + 1), 10)
        ctx.fillRect(Math.floor(tx * scaleX), Math.floor(ty * scaleY), pw, ph)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawPopulation(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    if (this.popGridRows === 0 || this.popGridCols === 0) return

    const cellW = w / this.popGridCols
    const cellH = h / this.popGridRows

    // Find max for normalization
    let max = 1
    for (let r = 0; r < this.popGridRows; r++) {
      for (let c = 0; c < this.popGridCols; c++) {
        if (this.popGrid[r][c] > max) max = this.popGrid[r][c]
      }
    }

    ctx.globalAlpha = 0.55
    for (let r = 0; r < this.popGridRows; r++) {
      for (let c = 0; c < this.popGridCols; c++) {
        const v = this.popGrid[r][c]
        if (v <= 0) continue
        const t = Math.min(v / max, 1)
        ctx.fillStyle = HEATMAP_COLORS[Math.round(t * 100)]
        ctx.fillRect(
          Math.floor(c * cellW),
          Math.floor(r * cellH),
          Math.ceil(cellW) || 1,
          Math.ceil(cellH) || 1
        )
      }
    }
    ctx.globalAlpha = 1
  }

  private drawResources(
    ctx: OffscreenCanvasRenderingContext2D,
    world: World,
    w: number,
    h: number
  ): void {
    const scaleX = w / this.worldWidth
    const scaleY = h / this.worldHeight
    const dotSize = Math.max(1, Math.ceil(Math.min(scaleX, scaleY)))

    // Resource tiles: FOREST=wood(green), MOUNTAIN=stone(gray)/gold(yellow)
    const resourceColors: Partial<Record<TileType, string>> = {
      [TileType.FOREST]: '#228B22',
      [TileType.MOUNTAIN]: '#808080',
    }

    ctx.globalAlpha = 0.7
    for (let ty = 0; ty < this.worldHeight; ty++) {
      for (let tx = 0; tx < this.worldWidth; tx++) {
        const tile = world.tiles[ty]?.[tx]
        if (tile === undefined) continue
        const color = resourceColors[tile]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(Math.floor(tx * scaleX), Math.floor(ty * scaleY), dotSize, dotSize)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawMilitary(
    ctx: OffscreenCanvasRenderingContext2D,
    em: EntityManager,
    civManager: CivManager,
    w: number,
    h: number
  ): void {
    const scaleX = w / this.worldWidth
    const scaleY = h / this.worldHeight
    const radius = Math.max(2, Math.ceil(Math.min(scaleX, scaleY) * 0.8))

    // Find all soldiers
    const soldiers = em.getEntitiesWithComponents('civMember', 'position')

    ctx.globalAlpha = 0.85
    for (const id of soldiers) {
      const member = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (!member || member.role !== 'soldier') continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      const ai = em.getComponent<AIComponent>(id, 'ai')
      const inCombat = ai?.state === 'attacking'

      // Use civ color, red override if in combat
      let color = '#ffff00'
      if (inCombat) {
        color = '#ff0000'
      } else {
        const civ = civManager.civilizations.get(member.civId)
        if (civ) color = civ.color
      }

      const cx = Math.floor((pos.x / this.worldWidth) * w)
      const cy = Math.floor((pos.y / this.worldHeight) * h)

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
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
