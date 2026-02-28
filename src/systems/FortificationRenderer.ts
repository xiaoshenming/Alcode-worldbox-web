import { TILE_SIZE } from '../utils/Constants'
const _EMPTY_DASH: number[] = []
// Pre-computed integer-to-string lookup — avoids String(n) per-fort per-frame
const _INT_STR: readonly string[] = ['0','1','2','3','4','5','6','7','8','9','10']

export type FortificationLevel = 'none' | 'wooden' | 'stone' | 'castle'

export interface CityFortification {
  cityId: number
  civId: number
  centerX: number
  centerY: number
  radius: number
  level: FortificationLevel
  health: number
  maxHealth: number
  towerCount: number
  hasMoat: boolean
  isUnderAttack: boolean
  color: string
}

// 城墙风格配置
const WALL_STYLES: Record<Exclude<FortificationLevel, 'none'>, {
  color: string
  lineWidth: number
  dash: number[]
  towerColor: string
}> = {
  wooden: { color: '#8B6914', lineWidth: 1, dash: [4, 3], towerColor: '#6B4F10' },
  stone:  { color: '#808080', lineWidth: 2, dash: [],     towerColor: '#606060' },
  castle: { color: '#505050', lineWidth: 3, dash: [],     towerColor: '#383838' }
}

const MOAT_COLOR = 'rgba(30, 144, 255, 0.3)'
const MOAT_BORDER = 'rgba(30, 144, 255, 0.5)'
const ATTACK_FLASH_COLOR = 'rgba(255, 40, 40, 0.6)'

export class FortificationRenderer {
  private fortifications: CityFortification[] = []
  private animTime: number = 0

  updateFortifications(forts: CityFortification[]): void {
    this.fortifications = forts
  }

  update(): void {
    this.animTime += 1
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number, cameraY: number, zoom: number,
    startX: number, startY: number, endX: number, endY: number
  ): void {
    if (this.fortifications.length === 0) return

    ctx.save()
    ctx.scale(zoom, zoom)
    ctx.translate(-cameraX, -cameraY)

    for (const fort of this.fortifications) {
      if (fort.level === 'none') continue

      // 城市中心像素坐标
      const cx = fort.centerX * TILE_SIZE + TILE_SIZE / 2
      const cy = fort.centerY * TILE_SIZE + TILE_SIZE / 2
      const halfSize = fort.radius * TILE_SIZE

      // 粗略裁剪：城市包围盒是否在可见区域内
      const left = cx - halfSize - TILE_SIZE * 2
      const right = cx + halfSize + TILE_SIZE * 2
      const top = cy - halfSize - TILE_SIZE * 2
      const bottom = cy + halfSize + TILE_SIZE * 2
      const viewLeft = startX * TILE_SIZE
      const viewRight = endX * TILE_SIZE
      const viewTop = startY * TILE_SIZE
      const viewBottom = endY * TILE_SIZE
      if (right < viewLeft || left > viewRight || bottom < viewTop || top > viewBottom) continue

      const offsetX = cx - halfSize
      const offsetY = cy - halfSize
      const tileSize = halfSize * 2

      // 渲染顺序：护城河 → 城墙 → 箭塔 → 防御指示器
      if (fort.hasMoat) {
        this.renderMoat(ctx, fort, offsetX, offsetY, tileSize)
      }
      this.renderWalls(ctx, fort, offsetX, offsetY, tileSize)
      this.renderTowers(ctx, fort, offsetX, offsetY, tileSize)
      this.renderDefenseIndicator(ctx, fort, cx, offsetY, tileSize)
    }

    ctx.restore()
  }

  // ---- 城墙 ----
  private renderWalls(
    ctx: CanvasRenderingContext2D,
    fort: CityFortification,
    x: number, y: number, size: number
  ): void {
    if (fort.level === 'none') return
    const style = WALL_STYLES[fort.level]

    ctx.beginPath()
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.lineWidth
    ctx.setLineDash(style.dash)
    ctx.globalAlpha = 0.9
    ctx.strokeRect(x, y, size, size)
    ctx.setLineDash(_EMPTY_DASH)

    // 城堡等级：绘制城垛锯齿
    if (fort.level === 'castle') {
      this.renderBattlements(ctx, x, y, size, style.color)
    }

    // 战时闪烁红色边框
    if (fort.isUnderAttack) {
      const flash = Math.sin(this.animTime * 0.15) * 0.5 + 0.5
      ctx.globalAlpha = flash * 0.6
      ctx.strokeStyle = ATTACK_FLASH_COLOR
      ctx.lineWidth = style.lineWidth + 1
      ctx.strokeRect(x - 1, y - 1, size + 2, size + 2)
    }

    ctx.globalAlpha = 1
  }

  // 城垛锯齿（沿城墙顶部和底部）
  private renderBattlements(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number,
    color: string
  ): void {
    const merlonSize = 3  // 城垛方块大小
    const gap = 3         // 城垛间距
    const step = merlonSize + gap
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85

    // 上边
    for (let i = 0; i < size; i += step) {
      ctx.fillRect(x + i, y - merlonSize, merlonSize, merlonSize)
    }
    // 下边
    for (let i = 0; i < size; i += step) {
      ctx.fillRect(x + i, y + size, merlonSize, merlonSize)
    }
    // 左边
    for (let i = 0; i < size; i += step) {
      ctx.fillRect(x - merlonSize, y + i, merlonSize, merlonSize)
    }
    // 右边
    for (let i = 0; i < size; i += step) {
      ctx.fillRect(x + size, y + i, merlonSize, merlonSize)
    }
  }

  // ---- 箭塔 ----
  private renderTowers(
    ctx: CanvasRenderingContext2D,
    fort: CityFortification,
    x: number, y: number, size: number
  ): void {
    if (fort.towerCount <= 0 || fort.level === 'none') return

    const style = WALL_STYLES[fort.level]
    const towerSize = Math.max(4, Math.min(6, TILE_SIZE * 0.8))
    const halfTower = towerSize / 2

    // 四角位置
    const corners = [
      { cx: x, cy: y },                     // 左上
      { cx: x + size, cy: y },              // 右上
      { cx: x, cy: y + size },              // 左下
      { cx: x + size, cy: y + size }        // 右下
    ]

    // 根据 towerCount 决定绘制几个角（1-4）
    const count = Math.min(fort.towerCount, 4)
    for (let i = 0; i < count; i++) {
      const c = corners[i]

      // 方块底座
      ctx.fillStyle = style.towerColor
      ctx.globalAlpha = 0.95
      ctx.fillRect(c.cx - halfTower, c.cy - halfTower, towerSize, towerSize)

      // 顶部三角形（屋顶）
      ctx.beginPath()
      ctx.moveTo(c.cx - halfTower - 1, c.cy - halfTower)
      ctx.lineTo(c.cx, c.cy - halfTower - towerSize * 0.6)
      ctx.lineTo(c.cx + halfTower + 1, c.cy - halfTower)
      ctx.closePath()
      ctx.fillStyle = fort.color || style.towerColor
      ctx.globalAlpha = 0.85
      ctx.fill()

      // 战时闪烁红点
      if (fort.isUnderAttack) {
        const flash = Math.sin(this.animTime * 0.2 + i) * 0.5 + 0.5
        ctx.globalAlpha = flash
        ctx.fillStyle = '#ff3333'
        ctx.fillRect(c.cx - 1, c.cy - 1, 2, 2)
      }
    }

    ctx.globalAlpha = 1
  }

  // ---- 护城河 ----
  private renderMoat(
    ctx: CanvasRenderingContext2D,
    fort: CityFortification,
    x: number, y: number, size: number
  ): void {
    const moatOffset = 3  // 护城河距城墙的偏移
    const moatWidth = 2

    // 外围半透明蓝色矩形
    ctx.strokeStyle = MOAT_BORDER
    ctx.lineWidth = moatWidth
    ctx.globalAlpha = 0.5
    ctx.strokeRect(
      x - moatOffset,
      y - moatOffset,
      size + moatOffset * 2,
      size + moatOffset * 2
    )

    // 内部填充更淡的水色
    ctx.fillStyle = MOAT_COLOR
    ctx.globalAlpha = 0.25

    // 上
    ctx.fillRect(x - moatOffset, y - moatOffset, size + moatOffset * 2, moatWidth + 1)
    // 下
    ctx.fillRect(x - moatOffset, y + size + moatOffset - moatWidth, size + moatOffset * 2, moatWidth + 1)
    // 左
    ctx.fillRect(x - moatOffset, y - moatOffset, moatWidth + 1, size + moatOffset * 2)
    // 右
    ctx.fillRect(x + size + moatOffset - moatWidth, y - moatOffset, moatWidth + 1, size + moatOffset * 2)

    // 水面波纹动画
    const wavePhase = this.animTime * 0.08
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < size; i += 8) {
      const waveY = Math.sin(wavePhase + i * 0.3) * 0.5
      ctx.fillRect(x + i, y - moatOffset + waveY, 2, 1)
      ctx.fillRect(x + i, y + size + moatOffset - 1 + waveY, 2, 1)
    }

    ctx.globalAlpha = 1
  }

  // ---- 防御力指示器 ----
  private renderDefenseIndicator(
    ctx: CanvasRenderingContext2D,
    fort: CityFortification,
    cx: number, topY: number, size: number
  ): void {
    const indicatorY = topY - 10
    const shieldW = 6
    const shieldH = 7

    // 盾牌图标
    ctx.fillStyle = fort.color || '#888888'
    ctx.globalAlpha = 0.85

    // 盾牌形状：上半矩形 + 下半三角
    ctx.beginPath()
    ctx.moveTo(cx - shieldW / 2, indicatorY)
    ctx.lineTo(cx + shieldW / 2, indicatorY)
    ctx.lineTo(cx + shieldW / 2, indicatorY + shieldH * 0.55)
    ctx.lineTo(cx, indicatorY + shieldH)
    ctx.lineTo(cx - shieldW / 2, indicatorY + shieldH * 0.55)
    ctx.closePath()
    ctx.fill()

    // 盾牌边框
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.5
    ctx.stroke()

    // 防御等级数字
    const defenseLevel = this.getDefenseLevel(fort)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.font = '4px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(_INT_STR[defenseLevel] ?? String(defenseLevel), cx, indicatorY + shieldH * 0.4)

    // 血量条（盾牌下方）
    if (fort.health < fort.maxHealth) {
      const barW = 10
      const barH = 1.5
      const barX = cx - barW / 2
      const barY = indicatorY + shieldH + 2
      const ratio = fort.health / fort.maxHealth

      // 背景
      ctx.fillStyle = '#333333'
      ctx.globalAlpha = 0.6
      ctx.fillRect(barX, barY, barW, barH)

      // 血量
      const hpColor = ratio > 0.5 ? '#44cc44' : ratio > 0.25 ? '#ccaa00' : '#cc3333'
      ctx.fillStyle = hpColor
      ctx.globalAlpha = 0.8
      ctx.fillRect(barX, barY, barW * ratio, barH)
    }

    ctx.globalAlpha = 1
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }

  // 根据等级和血量计算防御力数值
  private getDefenseLevel(fort: CityFortification): number {
    const baseDef: Record<Exclude<FortificationLevel, 'none'>, number> = {
      wooden: 1,
      stone: 2,
      castle: 3
    }
    const base = fort.level === 'none' ? 0 : baseDef[fort.level]
    const towerBonus = Math.min(fort.towerCount, 4)
    const moatBonus = fort.hasMoat ? 1 : 0
    const healthMult = fort.health / Math.max(1, fort.maxHealth)
    return Math.round((base + towerBonus + moatBonus) * healthMult)
  }
}
