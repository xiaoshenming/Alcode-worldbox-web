/**
 * CinematicModeSystem - 电影模式系统
 * 按 C 键进入/退出电影模式，隐藏 UI 并显示电影黑边，
 * 摄像机沿兴趣点自动巡游，使用贝塞尔曲线平滑过渡，
 * 靠近兴趣点时自动放大，移动途中自动缩小。
 */

/** 兴趣点定义 */
interface InterestPoint {
  x: number
  y: number
  label: string
}

/** 贝塞尔巡游段 */
interface CruiseSegment {
  p0x: number; p0y: number
  p1x: number; p1y: number
  p2x: number; p2y: number
  p3x: number; p3y: number
  targetIdx: number
}

/** update 返回的摄像机状态 */
export interface CinematicCamera {
  camX: number
  camY: number
  zoom: number
}

/** 黑边高度（像素） */
const BAR_HEIGHT = 60
/** 巡游一段的 tick 数 */
const SEGMENT_TICKS = 300
/** 最小缩放 */
const ZOOM_MIN = 0.6
/** 最大缩放（靠近兴趣点） */
const ZOOM_MAX = 1.8
/** 标签字体 */
const LABEL_FONT = '14px monospace'
/** 标签背景色 */
const LABEL_BG = 'rgba(0,0,0,0.65)'
/** 黑边颜色 */
const BAR_COLOR = 'rgba(0,0,0,0.92)'

export class CinematicModeSystem {
  private active = false
  private points: InterestPoint[] = []
  private currentSegment: CruiseSegment | null = null
  private segmentStart = 0
  private lastTargetIdx = -1
  /** 黑边动画进度 0..1 */
  private barAnim = 0
  /** 当前插值位置 */
  private cx = 0
  private cy = 0
  private cz = 1

  constructor() { /* 无参数 */ }

  /**
   * 添加兴趣点，巡游时摄像机会依次或随机访问这些点
   * @param x 世界坐标 X
   * @param y 世界坐标 Y
   * @param label 兴趣点标签（如村庄名）
   */
  addInterestPoint(x: number, y: number, label: string): void {
    this.points.push({ x, y, label })
  }

  /**
   * 处理键盘输入
   * @param key 按键名称
   * @returns 是否消费了该按键
   */
  handleKey(key: string): boolean {
    if (key.toLowerCase() !== 'c') return false
    this.active = !this.active
    if (this.active) {
      this.currentSegment = null
      this.segmentStart = 0
    }
    return true
  }

  /** 电影模式是否激活 */
  isActive(): boolean {
    return this.active
  }

  /**
   * 每帧更新，返回摄像机目标位置；非电影模式返回 null
   * @param tick 当前游戏 tick
   */
  update(tick: number): CinematicCamera | null {
    // 黑边动画（进入/退出过渡）
    const target = this.active ? 1 : 0
    this.barAnim += (target - this.barAnim) * 0.08
    if (!this.active) {
      if (this.barAnim < 0.01) this.barAnim = 0
      return null
    }

    if (this.points.length === 0) {
      return { camX: this.cx, camY: this.cy, zoom: 1 }
    }

    // 需要新巡游段
    if (!this.currentSegment || tick - this.segmentStart >= SEGMENT_TICKS) {
      this.currentSegment = this.buildSegment()
      this.segmentStart = tick
    }

    const seg = this.currentSegment
    const t = Math.min((tick - this.segmentStart) / SEGMENT_TICKS, 1)
    const st = smoothstep(t)

    // 三次贝塞尔插值
    this.cx = cubicBezier(st, seg.p0x, seg.p1x, seg.p2x, seg.p3x)
    this.cy = cubicBezier(st, seg.p0y, seg.p1y, seg.p2y, seg.p3y)

    // 缩放：靠近目标点时放大
    const dest = this.points[seg.targetIdx]
    const dx = this.cx - dest.x
    const dy = this.cy - dest.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const proximity = Math.max(0, 1 - dist / 500)
    this.cz = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * proximity

    return { camX: this.cx, camY: this.cy, zoom: this.cz }
  }

  /**
   * 渲染电影模式叠加层（黑边 + 标签）
   * @param ctx Canvas 2D 上下文
   * @param screenW 屏幕宽度
   * @param screenH 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (this.barAnim < 0.005) return

    const barH = BAR_HEIGHT * this.barAnim

    // 上黑边
    ctx.fillStyle = BAR_COLOR
    ctx.fillRect(0, 0, screenW, barH)
    // 下黑边
    ctx.fillRect(0, screenH - barH, screenW, barH)

    if (!this.active) return

    // 右下角标签
    const labelText = '\u7535\u5f71\u6a21\u5f0f'
    const hintText = '\u6309 C \u9000\u51fa'
    const padding = 10
    const lineH = 18
    const boxW = 120
    const boxH = lineH * 2 + padding * 2
    const bx = screenW - boxW - 16
    const by = screenH - barH - boxH - 12

    ctx.fillStyle = LABEL_BG
    roundRect(ctx, bx, by, boxW, boxH, 6)
    ctx.fill()

    ctx.font = LABEL_FONT
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(labelText, bx + padding, by + padding)
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText(hintText, bx + padding, by + padding + lineH)

    // 当前兴趣点标签（底部居中）
    if (this.currentSegment && this.points.length > 0) {
      const pt = this.points[this.currentSegment.targetIdx]
      if (pt.label) {
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(pt.label, screenW / 2, screenH - barH - 8)
      }
    }
  }

  // ---- 内部方法 ----

  /** 构建下一段贝塞尔巡游路径 */
  private buildSegment(): CruiseSegment {
    const idx = this.pickNextTarget()
    const dest = this.points[idx]

    // 起点为当前位置
    const p0x = this.cx
    const p0y = this.cy

    // 终点为目标兴趣点
    const p3x = dest.x
    const p3y = dest.y

    // 控制点：在起终点之间加随机偏移，制造弧线
    const mx = (p0x + p3x) / 2
    const my = (p0y + p3y) / 2
    const spread = Math.sqrt((p3x - p0x) ** 2 + (p3y - p0y) ** 2) * 0.4
    const angle1 = Math.random() * Math.PI * 2
    const angle2 = Math.random() * Math.PI * 2

    const p1x = mx + Math.cos(angle1) * spread * (0.5 + Math.random() * 0.5)
    const p1y = my + Math.sin(angle1) * spread * (0.5 + Math.random() * 0.5)
    const p2x = mx + Math.cos(angle2) * spread * (0.3 + Math.random() * 0.5)
    const p2y = my + Math.sin(angle2) * spread * (0.3 + Math.random() * 0.5)

    this.lastTargetIdx = idx
    return { p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, targetIdx: idx }
  }

  /** 随机选择下一个兴趣点（避免连续重复） */
  private pickNextTarget(): number {
    if (this.points.length === 1) return 0
    let idx: number
    do {
      idx = Math.floor(Math.random() * this.points.length)
    } while (idx === this.lastTargetIdx && this.points.length > 1)
    return idx
  }
}

// ---- 工具函数 ----

/** 三次贝塞尔插值 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

/** smoothstep 缓动 */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 绘制圆角矩形路径 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
