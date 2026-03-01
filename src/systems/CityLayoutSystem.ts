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

interface AStarNode {
  x: number; y: number; g: number; h: number; f: number
  parent: AStarNode | null
}

const TILE = 16
const ROAD_PRIMARY = '#8B7355'
const ROAD_SECONDARY = '#A0937D'
const WALL_COLOR = '#6B6B6B'
const WALL_TOP = '#8A8A8A'
const FENCE_COLOR = '#8B6914'
/** 不可通行地形 ID（深水=0, 浅水=1, 山地=6, 岩浆=7） */
const IMPASSABLE = new Set([0, 1, 6, 7])
const UPDATE_INTERVAL = 120
// Pre-allocated 4-directional offsets — avoids per-call array allocation in BFS/expansion
const CARDINAL_DIRS: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

export class CityLayoutSystem {
  private layouts = new Map<number, CityLayout>()
  private cities = new Map<number, CityData>()
  /** Pre-allocated sets reused across rebuildLayout calls — avoids per-city-update GC */
  private _roadSet = new Set<number>()
  private _closedSet = new Set<number>()
  private _roadEndsSet = new Set<number>()

  /** 更新/注册城市数据并标记需要重算布局 */
  updateCity(city: CityData, getTerrain: (x: number, y: number) => number): void {
    this.cities.set(city.id, city)
    const layout = this.getOrCreate(city.id)
    layout.level = this.calcLevel(city)
    layout.dirty = true
    this.rebuildLayout(city, getTerrain, layout)
  }

  removeCity(cityId: number): void {
    this.layouts.delete(cityId)
    this.cities.delete(cityId)
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

  /* ---- 内部方法 ---- */

  private getOrCreate(id: number): CityLayout {
    let l = this.layouts.get(id)
    if (!l) {
      l = { level: 'village', roads: [], walls: [], gates: [], zones: new Map(), dirty: true }
      this.layouts.set(id, l)
    }
    return l
  }

  private calcLevel(city: CityData): CityLevel {
    const n = city.buildings.length
    if (n > 50) return 'capital'
    if (n > 25) return 'city'
    if (n >= 10) return 'town'
    return 'village'
  }

  /** 重建整个城市布局 */
  private rebuildLayout(
    city: CityData,
    getTerrain: (x: number, y: number) => number,
    layout: CityLayout
  ): void {
    layout.roads.length = 0
    layout.walls.length = 0
    layout.gates.length = 0
    layout.zones.clear()

    this.assignZones(city, layout)
    this.generateRoads(city, getTerrain, layout)
    if (layout.level !== 'village') {
      this.generateWalls(city, layout)
    }
  }

  /* ---- 区划分配 ---- */

  private assignZones(city: CityData, layout: CityLayout): void {
    const cx = city.centerX, cy = city.centerY
    // 市中心 3x3
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        layout.zones.set((cx + dx) * 10000 + (cy + dy), 'center')
      }
    }
    // 按距离分配其余建筑所在 tile
    if (city.buildings.length === 0) return
    let maxDist = 0
    for (const b of city.buildings) {
      const d = Math.abs(b.x - cx) + Math.abs(b.y - cy)
      if (d > maxDist) maxDist = d
    }
    const threshold = Math.max(maxDist * 0.4, 3)
    const edgeThreshold = Math.max(maxDist * 0.75, 5)
    for (const b of city.buildings) {
      const key = b.x * 10000 + b.y
      if (layout.zones.has(key)) continue
      const d = Math.abs(b.x - cx) + Math.abs(b.y - cy)
      if (d >= edgeThreshold) layout.zones.set(key, 'military')
      else if (d <= threshold) layout.zones.set(key, 'commercial')
      else layout.zones.set(key, 'residential')
    }
  }

  /* ---- 道路生成 ---- */

  private generateRoads(
    city: CityData,
    getTerrain: (x: number, y: number) => number,
    layout: CityLayout
  ): void {
    if (city.buildings.length < 2) return
    const cx = city.centerX, cy = city.centerY
    const isPrimary = layout.level === 'capital' || layout.level === 'city'
    // 四方向主干道延伸到最远建筑
    const primaryEnds: Array<{x: number; y: number}> = []

    for (const [ddx, ddy] of CARDINAL_DIRS) {
      let farthest = 0
      for (const b of city.buildings) {
        const proj = (b.x - cx) * ddx + (b.y - cy) * ddy
        if (proj > farthest) farthest = proj
      }
      if (farthest < 2) continue
      const ex = cx + ddx * farthest
      const ey = cy + ddy * farthest
      const path = this.findPath(cx, cy, ex, ey, getTerrain)
      if (path.length > 1) {
        for (let i = 0; i < path.length - 1; i++) {
          layout.roads.push({
            x1: path[i].x, y1: path[i].y,
            x2: path[i + 1].x, y2: path[i + 1].y,
            width: isPrimary ? 2 : 1, isPrimary: true,
          })
        }
        primaryEnds.push({x: ex, y: ey})
      }
    }
    // 次级道路：连接未在主干道上的建筑到最近主干道点
    const roadSet = this._roadSet; roadSet.clear()
    for (const r of layout.roads) {
      roadSet.add(r.x1 * 10000 + r.y1)
      roadSet.add(r.x2 * 10000 + r.y2)
    }
    for (const b of city.buildings) {
      if (roadSet.has(b.x * 10000 + b.y)) continue
      let bestDist = Infinity, bestPt = {x: cx, y: cy}
      for (const k of roadSet) {
        const rx = Math.floor(k / 10000)
        const ry = k % 10000
        const d = Math.abs(b.x - rx) + Math.abs(b.y - ry)
        if (d < bestDist) { bestDist = d; bestPt = {x: rx, y: ry} }
      }
      const path = this.findPath(b.x, b.y, bestPt.x, bestPt.y, getTerrain)
      for (let i = 0; i < path.length - 1; i++) {
        layout.roads.push({
          x1: path[i].x, y1: path[i].y,
          x2: path[i + 1].x, y2: path[i + 1].y,
          width: 1, isPrimary: false,
        })
      }
    }
  }

  /* ---- 简化 A* 寻路 ---- */

  private findPath(
    sx: number, sy: number, ex: number, ey: number,
    getTerrain: (x: number, y: number) => number
  ): Array<{x: number; y: number}> {
    const open: AStarNode[] = []
    const closed = this._closedSet; closed.clear()  // numeric key = x * 10000 + y
    const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey)

    open.push({x: sx, y: sy, g: 0, h: h(sx, sy), f: h(sx, sy), parent: null})
    let iterations = 0
    const maxIter = 500

    while (open.length > 0 && iterations++ < maxIter) {
      // 找 f 最小
      let minIdx = 0
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[minIdx].f) minIdx = i
      }
      const cur = open[minIdx]
      open.splice(minIdx, 1)

      if (cur.x === ex && cur.y === ey) {
        const path: Array<{x: number; y: number}> = []
        let n: AStarNode | null = cur
        while (n) { path.push({x: n.x, y: n.y}); n = n.parent }
        path.reverse()
        return path
      }

      closed.add(cur.x * 10000 + cur.y)
      for (const [dx, dy] of CARDINAL_DIRS) {
        const nx = cur.x + dx, ny = cur.y + dy
        if (closed.has(nx * 10000 + ny)) continue
        if (IMPASSABLE.has(getTerrain(nx, ny))) continue
        const g = cur.g + 1
        const existing = open.find(n => n.x === nx && n.y === ny)
        if (existing) {
          if (g < existing.g) { existing.g = g; existing.f = g + existing.h; existing.parent = cur }
        } else {
          const hv = h(nx, ny)
          open.push({x: nx, y: ny, g, h: hv, f: g + hv, parent: cur})
        }
      }
    }
    // 回退：直线路径
    return [{x: sx, y: sy}, {x: ex, y: ey}]
  }

  /* ---- 城墙生成（Graham scan 凸包） ---- */

  private generateWalls(city: CityData, layout: CityLayout): void {
    if (city.buildings.length < 3) return
    const points = city.buildings.map(b => ({x: b.x, y: b.y}))
    // 加入中心
    points.push({x: city.centerX, y: city.centerY})
    const hull = this.convexHull(points)
    if (hull.length < 3) return

    // 向外扩展 2 tile
    const cx = city.centerX, cy = city.centerY
    const expanded = hull.map(p => {
      const dx = p.x - cx, dy = p.y - cy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      return {x: Math.round(p.x + (dx / len) * 2), y: Math.round(p.y + (dy / len) * 2)}
    })

    // 沿凸包边插值墙体 tile
    for (let i = 0; i < expanded.length; i++) {
      const a = expanded[i], b = expanded[(i + 1) % expanded.length]
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      for (let t = 0; t <= steps; t++) {
        const frac = steps === 0 ? 0 : t / steps
        layout.walls.push({
          x: Math.round(a.x + (b.x - a.x) * frac),
          y: Math.round(a.y + (b.y - a.y) * frac),
        })
      }
    }

    // 城门：主干道与城墙交叉处
    const roadEnds = this._roadEndsSet; roadEnds.clear()
    for (const r of layout.roads) {
      if (r.isPrimary) {
        roadEnds.add(r.x2 * 10000 + r.y2)
      }
    }
    for (const w of layout.walls) {
      if (roadEnds.has(w.x * 10000 + w.y)) {
        layout.gates.push({x: w.x, y: w.y})
      }
    }
    // 至少保证有一个门
    if (layout.gates.length === 0 && layout.walls.length > 0) {
      layout.gates.push(layout.walls[0])
    }
  }

  /** Graham scan 凸包 */
  private convexHull(pts: Array<{x: number; y: number}>): Array<{x: number; y: number}> {
    if (pts.length < 3) return [...pts]
    // 找最低点（y 最大，x 最小）
    let pivot = pts[0]
    for (const p of pts) {
      if (p.y > pivot.y || (p.y === pivot.y && p.x < pivot.x)) pivot = p
    }
    const sorted = pts
      .filter(p => p !== pivot)
      .sort((a, b) => {
        const angA = Math.atan2(a.y - pivot.y, a.x - pivot.x)
        const angB = Math.atan2(b.y - pivot.y, b.x - pivot.x)
        return angA - angB || (this.dist2(pivot, a) - this.dist2(pivot, b))
      })

    const stack: Array<{x: number; y: number}> = [pivot]
    for (const p of sorted) {
      while (stack.length > 1 && this.cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
        stack.pop()
      }
      stack.push(p)
    }
    return stack
  }

  private cross(o: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  }

  private dist2(a: {x: number; y: number}, b: {x: number; y: number}): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
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
    // Build gate lookup without allocating a new Set per frame
    const gates = layout.gates
    const wallW = TILE * zoom
    const merlonSize = Math.max(2, zoom * 3)

    for (let i = 0; i < layout.walls.length; i++) {
      const w = layout.walls[i]
      if (gates.some(g => g.x === w.x && g.y === w.y)) continue // 城门处留空
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
