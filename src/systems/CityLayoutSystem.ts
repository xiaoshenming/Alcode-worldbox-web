/**
 * CityLayoutSystem - 城市布局系统
 * 自动生成道路网络、建筑区划和城墙
 */

/** 城市数据 */
export interface CityData {
  id: number
  centerX: number; centerY: number
  buildings: Array<{x: number; y: number; type: string}>
  population: number
}

/** 道路段 */
export interface RoadSegment {
  x1: number; y1: number; x2: number; y2: number
  width: number; isPrimary: boolean
}

type CityLevel = 'village' | 'town' | 'city' | 'capital'
type ZoneType = 'center' | 'commercial' | 'residential' | 'military'

interface CityLayout {
  level: CityLevel
  roads: RoadSegment[]
  walls: Array<{x: number; y: number}>
  gates: Array<{x: number; y: number}>
  zones: Map<number, ZoneType>  // key = x * 10000 + y
  dirty: boolean
}

const TILE = 16
const ROAD_PRIMARY = '#8B7355'
const ROAD_SECONDARY = '#A0937D'
const WALL_COLOR = '#6B6B6B'
const WALL_TOP = '#8A8A8A'
const FENCE_COLOR = '#8B6914'
const UPDATE_INTERVAL = 120

export class CityLayoutSystem {
  private layouts = new Map<number, CityLayout>()
  /** Pre-allocated gate lookup set — avoids gates.some() closure in render hot-path */
  private _gateKeySet = new Set<number>()

  removeCity(cityId: number): void {
    this.layouts.delete(cityId)
  }

  getCityLevel(cityId: number): CityLevel {
    return this.layouts.get(cityId)?.level ?? 'village'
  }

  getRoads(cityId: number): RoadSegment[] {
    return this.layouts.get(cityId)?.roads ?? []
  }

  /** 周期性检查脏标记并重算 */
  update(tick: number): void {
    if (tick % UPDATE_INTERVAL !== 0) return
    for (const layout of this.layouts.values()) {
      if (layout.dirty) layout.dirty = false
    }
  }

  /** 渲染道路和城墙 */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    ctx.save()
    for (const layout of this.layouts.values()) {
      this.renderRoads(ctx, layout, camX, camY, zoom)
      if (layout.level !== 'village') {
        this.renderWalls(ctx, layout, camX, camY, zoom)
      }
    }
    ctx.restore()
  }

  /* ---- 渲染：道路 ---- */

  private renderRoads(
    ctx: CanvasRenderingContext2D, layout: CityLayout,
    camX: number, camY: number, zoom: number
  ): void {
    for (const r of layout.roads) {
      const x1 = (r.x1 * TILE - camX) * zoom + (TILE * zoom) / 2
      const y1 = (r.y1 * TILE - camY) * zoom + (TILE * zoom) / 2
      const x2 = (r.x2 * TILE - camX) * zoom + (TILE * zoom) / 2
      const y2 = (r.y2 * TILE - camY) * zoom + (TILE * zoom) / 2
      ctx.strokeStyle = r.isPrimary ? ROAD_PRIMARY : ROAD_SECONDARY
      ctx.lineWidth = r.width * zoom * 0.8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  /* ---- 渲染：城墙 ---- */

  private renderWalls(
    ctx: CanvasRenderingContext2D, layout: CityLayout,
    camX: number, camY: number, zoom: number
  ): void {
    const isFence = layout.level === 'town'
    const isDouble = layout.level === 'capital'
    // Build gate lookup set — reuse pre-allocated set to avoid per-frame allocation
    const gateKeys = this._gateKeySet; gateKeys.clear()
    for (const g of layout.gates) gateKeys.add(g.x * 10000 + g.y)
    const wallW = TILE * zoom
    const merlonSize = Math.max(2, zoom * 3)

    for (let i = 0; i < layout.walls.length; i++) {
      const w = layout.walls[i]
      if (gateKeys.has(w.x * 10000 + w.y)) continue // 城门处留空
      const px = (w.x * TILE - camX) * zoom
      const py = (w.y * TILE - camY) * zoom

      if (isFence) {
        // 木栅栏
        ctx.fillStyle = FENCE_COLOR
        ctx.fillRect(px + wallW * 0.3, py, wallW * 0.4, wallW)
      } else {
        // 石墙底部
        ctx.fillStyle = WALL_COLOR
        ctx.fillRect(px, py, wallW, wallW)
        // 墙顶
        ctx.fillStyle = WALL_TOP
        ctx.fillRect(px + 1, py, wallW - 2, wallW * 0.4)
        // 城垛：间隔矩形
        if (i % 2 === 0) {
          ctx.fillStyle = WALL_TOP
          ctx.fillRect(px + wallW * 0.1, py - merlonSize, merlonSize, merlonSize)
          ctx.fillRect(px + wallW - merlonSize - wallW * 0.1, py - merlonSize, merlonSize, merlonSize)
        }
        // 都城双层墙：内侧再画一层
        if (isDouble) {
          ctx.fillStyle = 'rgba(107,107,107,0.5)'
          ctx.fillRect(px + wallW * 0.15, py + wallW * 0.5, wallW * 0.7, wallW * 0.45)
        }
      }
    }
    // 渲染城门标记
    for (const g of layout.gates) {
      const px = (g.x * TILE - camX) * zoom
      const py = (g.y * TILE - camY) * zoom
      ctx.fillStyle = 'rgba(139,115,85,0.6)'
      ctx.fillRect(px, py, wallW, wallW)
      // 门洞
      ctx.fillStyle = 'rgba(60,40,20,0.8)'
      ctx.fillRect(px + wallW * 0.2, py + wallW * 0.1, wallW * 0.6, wallW * 0.8)
    }
  }
}
