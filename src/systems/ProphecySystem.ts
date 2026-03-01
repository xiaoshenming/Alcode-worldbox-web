/**
 * ProphecySystem - 预言系统 (v1.93)
 *
 * 随机生成世界预言，预言可能成真也可能失败。
 * 预言类型：灾难预言、战争预言、繁荣预言、英雄预言、灭亡预言。
 * 预言成真时触发对应世界事件。按 Shift+O 打开预言面板。
 */

/** 预言状态 */
const enum ProphecyState {
  Active = 0,
  Fulfilled = 1,
  Failed = 2,
  Expired = 3,
}

/** 预言类型 */
type ProphecyType = 'disaster' | 'war' | 'prosperity' | 'hero' | 'doom' | 'plague' | 'miracle'

// Pre-computed font strings to avoid per-prophecy string allocation in renderProphecyRow
const _PROPHECY_ACTIVE_FONT = 'bold 13px monospace'
const _PROPHECY_INACTIVE_FONT = '12px monospace'

/** 单条预言 */
interface Prophecy {
  id: number
  type: ProphecyType
  text: string
  state: ProphecyState
  /** 预言产生的 tick */
  createdTick: number
  /** 预言到期 tick */
  deadlineTick: number
  /** 实现概率 0-1 */
  probability: number
  /** Pre-computed render string — avoids toFixed per frame */
  probabilityStr: string
  /** Pre-computed '"text"' quoted display string — computed at creation */
  quotedText: string
  /** Pre-computed remaining+probability display line — updated each tick in update() */
  statusLine: string
  /** 关联文明 ID（-1 表示全局） */
  civId: number
  /** 是否已通知玩家 */
  notified: boolean
}

/** 预言模板 */
interface ProphecyTemplate {
  type: ProphecyType
  texts: string[]
  baseProbability: number
  durationTicks: number
}

const TEMPLATES: ProphecyTemplate[] = [
  { type: 'disaster', texts: ['大地将颤抖，山川崩裂', '天降火雨，焚尽一切', '洪水将吞没低地'], baseProbability: 0.35, durationTicks: 3000 },
  { type: 'war', texts: ['两族之间将爆发血战', '铁与火的时代即将来临', '征服者将从北方而来'], baseProbability: 0.4, durationTicks: 4000 },
  { type: 'prosperity', texts: ['丰收之年即将到来', '黄金时代将降临此地', '和平将持续百年'], baseProbability: 0.5, durationTicks: 3500 },
  { type: 'hero', texts: ['一位英雄将从平民中崛起', '传奇勇士将拯救世界', '命运之子即将诞生'], baseProbability: 0.3, durationTicks: 5000 },
  { type: 'doom', texts: ['末日将至，无人幸免', '黑暗将笼罩大地', '文明的终结已被注定'], baseProbability: 0.15, durationTicks: 6000 },
  { type: 'plague', texts: ['瘟疫将席卷大陆', '死亡之风从东方吹来', '疾病将考验所有种族'], baseProbability: 0.3, durationTicks: 3500 },
  { type: 'miracle', texts: ['奇迹将在圣地显现', '神明将赐予恩典', '天空将出现异象'], baseProbability: 0.25, durationTicks: 4000 },
]

const MAX_ACTIVE = 5
const GEN_INTERVAL = 2000
const PANEL_W = 440, PANEL_H = 400, HEADER_H = 36, ROW_H = 72

const TYPE_ICONS: Record<ProphecyType, string> = {
  disaster: '\u{1F30B}', war: '\u{2694}\u{FE0F}', prosperity: '\u{1F33E}',
  hero: '\u{1F9B8}', doom: '\u{1F480}', plague: '\u{2623}\u{FE0F}', miracle: '\u{2728}',
}

const TYPE_COLORS: Record<ProphecyType, string> = {
  disaster: '#ff6644', war: '#ff4444', prosperity: '#44dd66',
  hero: '#44aaff', doom: '#aa44ff', plague: '#aaaa22', miracle: '#ffdd44',
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

let nextProphecyId = 1

export class ProphecySystem {
  private prophecies: Prophecy[] = []
  private history: Prophecy[] = []
  private visible = false
  private panelX = 100
  private panelY = 60
  private scrollY = 0
  private tickCounter = 0
  private dragging = false
  private dragOX = 0
  private dragOY = 0
  /** Pre-computed panel header — rebuilt when prophecies.length changes */
  private _prevProphecyCount = -1
  private _headerStr = '🔮 世界预言 (0 活跃)'
  /** 外部回调：预言实现时触发 */
  onFulfilled: ((p: Prophecy) => void) | null = null

  /* ── 公共 API ── */

  getHistory(): readonly Prophecy[] { return this.history }

  /* ── 更新 ── */

  update(tick: number, civCount: number): void {
    this.tickCounter++

    // 自动生成预言
    if (this.tickCounter % GEN_INTERVAL === 0 && this.prophecies.length < MAX_ACTIVE && civCount > 0) {
      const tmpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
      const text = tmpl.texts[Math.floor(Math.random() * tmpl.texts.length)]
      const prob = tmpl.baseProbability + (Math.random() - 0.5) * 0.2
      this.prophecies.push({
        id: nextProphecyId++, type: tmpl.type, text, state: ProphecyState.Active,
        createdTick: tick, deadlineTick: tick + tmpl.durationTicks,
        probability: prob, probabilityStr: (prob * 100).toFixed(0),
        quotedText: `"${text}"`,
        statusLine: `概率: ${(prob * 100).toFixed(0)}%  剩余: ${tmpl.durationTicks} ticks`,
        civId: -1, notified: false,
      })
    }

    // 检查预言状态
    for (let i = this.prophecies.length - 1; i >= 0; i--) {
      const p = this.prophecies[i]
      if (tick >= p.deadlineTick) {
        // 到期判定
        if (Math.random() < p.probability) {
          p.state = ProphecyState.Fulfilled
          if (this.onFulfilled) this.onFulfilled(p)
        } else {
          p.state = ProphecyState.Failed
        }
        this.history.push(p)
        this.prophecies[i] = this.prophecies[this.prophecies.length - 1]
        this.prophecies.pop()
      } else {
        // Update statusLine — only when panel is visible to avoid per-tick alloc
        if (this.visible) {
          const remaining = p.deadlineTick - tick
          p.statusLine = `概率: ${p.probabilityStr}%  剩余: ${remaining > 0 ? remaining : 0} ticks`
        }
      }
    }

    // 限制历史长度
    if (this.history.length > 50) this.history.splice(0, this.history.length - 50)
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'O') {
      this.visible = !this.visible
      this.scrollY = 0
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D, tick: number): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY

    ctx.fillStyle = 'rgba(10,10,20,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(70,50,90,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#e8d0ff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    const pl = this.prophecies.length
    if (pl !== this._prevProphecyCount) { this._prevProphecyCount = pl; this._headerStr = `\u{1F52E} 世界预言 (${pl} 活跃)` }
    ctx.fillText(this._headerStr, px + 12, py + 24)

    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + 4 - this.scrollY

    // 活跃预言
    for (let i = 0; i < this.prophecies.length; i++) {
      const p = this.prophecies[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        this.renderProphecyRow(ctx, p, px, drawY, tick)
      }
      drawY += ROW_H
    }

    // 历史预言
    for (let i = this.history.length - 1; i >= 0; i--) {
      const p = this.history[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        this.renderProphecyRow(ctx, p, px, drawY, tick)
      }
      drawY += ROW_H
    }

    ctx.restore()
    ctx.textAlign = 'left'
  }

  private renderProphecyRow(ctx: CanvasRenderingContext2D, p: Prophecy, px: number, ry: number, tick: number): void {
    const isActive = p.state === ProphecyState.Active
    ctx.fillStyle = isActive ? 'rgba(50,30,70,0.4)' : 'rgba(30,30,40,0.3)'
    ctx.fillRect(px + 4, ry, PANEL_W - 8, ROW_H - 2)

    // 图标
    ctx.font = '20px sans-serif'
    ctx.fillText(TYPE_ICONS[p.type], px + 10, ry + 28)

    // 文本
    ctx.fillStyle = isActive ? TYPE_COLORS[p.type] : '#666'
    ctx.font = isActive ? _PROPHECY_ACTIVE_FONT : _PROPHECY_INACTIVE_FONT
    ctx.fillText(p.quotedText, px + 40, ry + 22)

    // 状态
    ctx.font = '11px monospace'
    if (isActive) {
      const remaining = p.deadlineTick - tick
      const span = p.deadlineTick - p.createdTick
      const pct = span > 0 ? Math.max(0, remaining / span) : 0
      ctx.fillStyle = '#aaa'
      ctx.fillText(p.statusLine, px + 40, ry + 42)
      // 进度条
      ctx.fillStyle = 'rgba(60,60,80,0.5)'
      ctx.fillRect(px + 40, ry + 50, 200, 4)
      ctx.fillStyle = TYPE_COLORS[p.type]
      ctx.fillRect(px + 40, ry + 50, 200 * (1 - pct), 4)
    } else {
      const label = p.state === ProphecyState.Fulfilled ? '\u{2705} 已应验' : '\u{274C} 未应验'
      ctx.fillStyle = p.state === ProphecyState.Fulfilled ? '#44dd66' : '#aa4444'
      ctx.fillText(label, px + 40, ry + 42)
    }
  }
}
