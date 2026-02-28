import { TILE_SIZE } from '../utils/Constants'
const _EMPTY_DASH: number[] = []
const _DASH_6_4: number[] = [6, 4]

export interface TradeRoute {
  fromX: number
  fromY: number
  toX: number
  toY: number
  volume: number  // 0-100 贸易量
  active: boolean
}

export class TradeRouteRenderer {
  private routes: TradeRoute[] = []
  private visible: boolean = true
  private animOffset: number = 0

  setRoutes(routes: TradeRoute[]): void {
    this.routes = routes
  }

  toggle(): void {
    this.visible = !this.visible
  }

  isVisible(): boolean {
    return this.visible
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    if (!this.visible || this.routes.length === 0) return

    this.animOffset += 0.5

    // 计算可见区域（像素坐标）
    const viewLeft = cameraX
    const viewTop = cameraY
    const viewRight = cameraX + ctx.canvas.width / zoom
    const viewBottom = cameraY + ctx.canvas.height / zoom

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(-cameraX, -cameraY)

    for (const route of this.routes) {
      if (!route.active) continue

      // 路线端点像素坐标（tile 中心）
      const x1 = route.fromX * TILE_SIZE + TILE_SIZE / 2
      const y1 = route.fromY * TILE_SIZE + TILE_SIZE / 2
      const x2 = route.toX * TILE_SIZE + TILE_SIZE / 2
      const y2 = route.toY * TILE_SIZE + TILE_SIZE / 2

      // 粗略裁剪：路线包围盒是否与视口相交
      const minX = Math.min(x1, x2)
      const maxX = Math.max(x1, x2)
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
      if (maxX < viewLeft || minX > viewRight || maxY < viewTop || minY > viewBottom) continue

      const color = this.getRouteColor(route.volume)
      const lineWidth = 1 + (route.volume / 100) * 2  // 1-3px
      const dotSize = 2 + (route.volume / 100) * 2     // 2-4px

      // 贝塞尔曲线控制点：向中垂线方向偏移
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const dx = x2 - x1
      const dy = y2 - y1
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.001) continue
      const bulge = dist * 0.15
      const cpx = mx + (-dy / dist) * bulge
      const cpy = my + (dx / dist) * bulge

      // 绘制虚线路线
      ctx.beginPath()
      ctx.setLineDash(_DASH_6_4)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.globalAlpha = 0.7
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(cpx, cpy, x2, y2)
      ctx.stroke()
      ctx.setLineDash(_EMPTY_DASH)

      // 沿曲线绘制移动小点
      ctx.globalAlpha = 1
      const dotColor = this.getDotColor(route.volume)
      const dotCount = Math.max(1, Math.floor(dist / 40))
      for (let i = 0; i < dotCount; i++) {
        const base = (i / dotCount + this.animOffset / dist) % 1
        const t = Math.max(0, Math.min(1, base))

        // 二次贝塞尔插值: B(t) = (1-t)^2*P0 + 2(1-t)t*CP + t^2*P1
        const inv = 1 - t
        const px = inv * inv * x1 + 2 * inv * t * cpx + t * t * x2
        const py = inv * inv * y1 + 2 * inv * t * cpy + t * t * y2

        ctx.beginPath()
        ctx.arc(px, py, dotSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
      }
    }

    ctx.restore()
    ctx.globalAlpha = 1
  }

  private getRouteColor(volume: number): string {
    if (volume < 30) return '#888888'       // 低：灰色
    if (volume < 65) return '#ccaa00'       // 中：黄色
    return '#ffc800'                         // 高：金色
  }

  private getDotColor(volume: number): string {
    if (volume < 30) return '#bbbbbb'       // 低：亮灰
    if (volume < 65) return '#ffdd44'       // 中：亮黄
    return '#ffe066'                         // 高：亮金
  }
}
