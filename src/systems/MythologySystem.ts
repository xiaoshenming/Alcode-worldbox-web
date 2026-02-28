/**
 * MythologySystem - 世界神话系统 (v1.96)
 *
 * 文明随时间发展独特的神话传说。神话影响文化认同和外交关系。
 * 包含创世神话、英雄传说、灾难传说等类型。
 * 按 Shift+Y 打开神话面板。
 */

/** 神话类型 */
type MythType = 'creation' | 'hero' | 'disaster' | 'divine' | 'prophecy' | 'origin'
const MYTH_TYPES: MythType[] = ['creation', 'hero', 'disaster', 'divine', 'prophecy', 'origin']

/** 单条神话 */
interface Myth {
  id: number
  type: MythType
  title: string
  text: string
  civId: number
  /** 产生 tick */
  createdTick: number
  /** 信仰强度 0-1 */
  belief: number
  /** 是否基于真实事件 */
  historical: boolean
  /** Pre-computed truncated text (max 40 chars) — computed at creation */
  truncText: string
}

/** 神话模板 */
const MYTH_TEMPLATES: Record<MythType, { titles: string[]; texts: string[] }> = {
  creation: {
    titles: ['天地初开', '万物之始', '混沌之歌'],
    texts: ['太初之时，世界从虚无中诞生', '大地从深海中升起，天空从火焰中凝结', '创世之神以泥土塑造了第一个生灵'],
  },
  hero: {
    titles: ['勇者之歌', '不朽传说', '英雄史诗'],
    texts: ['一位伟大的战士独自面对黑暗', '传说中的英雄以智慧战胜了巨龙', '英雄的牺牲拯救了整个部落'],
  },
  disaster: {
    titles: ['大洪水', '天火降临', '永冬之年'],
    texts: ['远古时代，洪水淹没了整个世界', '天空降下烈火，焚烧了旧世界', '漫长的寒冬几乎灭绝了所有生灵'],
  },
  divine: {
    titles: ['神明的恩赐', '天启', '圣光降临'],
    texts: ['神明从天而降，赐予人民智慧', '圣光照耀大地，驱散了黑暗', '神明的声音在风中回响'],
  },
  prophecy: {
    titles: ['末日预言', '黄金时代', '命运之轮'],
    texts: ['先知预言了一个新时代的到来', '古老的预言说终有一天和平将降临', '命运之轮转动，新的纪元即将开始'],
  },
  origin: {
    titles: ['族源传说', '先祖之路', '迁徙之歌'],
    texts: ['我们的祖先从遥远的东方迁徙而来', '第一位先祖在这片土地上建立了家园', '传说我们的血脉源自古老的神灵'],
  },
}

const TYPE_ICONS: Record<MythType, string> = {
  creation: '\u{1F30D}', hero: '\u{1F9B8}', disaster: '\u{1F32A}\u{FE0F}',
  divine: '\u{2728}', prophecy: '\u{1F52E}', origin: '\u{1F3D5}\u{FE0F}',
}

const PANEL_W = 460, PANEL_H = 420, HEADER_H = 36, TAB_H = 28, ROW_H = 80
const GEN_INTERVAL = 5000
const MAX_MYTHS_PER_CIV = 8

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

/** 预计算belief条颜色表 — 0到1映射到hsl(270,60%,40%..70%) */
const BELIEF_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const lightness = Math.round(40 + i * 0.3)
    cols.push(`hsl(270,60%,${lightness}%)`)
  }
  return cols
})()

let nextMythId = 1

const ALL_MYTH_TYPES: MythType[] = ['creation', 'hero', 'disaster', 'divine', 'prophecy', 'origin']

export class MythologySystem {
  private myths = new Map<number, Myth[]>()
  private visible = false
  private panelX = 90
  private panelY = 50
  private scrollY = 0
  private selectedCivId = -1
  private dragging = false
  private dragOX = 0
  private dragOY = 0
  private tickCounter = 0
  /** Pre-computed panel header — rebuilt when selected civ or myth count changes */
  private _prevMythCivId = -2
  private _prevMythCount = -1
  private _headerStr = '📖 文明神话 (0 篇)'

  /* ── 公共 API ── */

  getMythsForCiv(civId: number): readonly Myth[] {
    return this.myths.get(civId) ?? []
  }

  /** 文化相似度 0-1（共享神话类型越多越高） */
  getCulturalSimilarity(civA: number, civB: number): number {
    const a = this.myths.get(civA)
    const b = this.myths.get(civB)
    if (!a || !b || a.length === 0 || b.length === 0) return 0
    // Count shared unique types without Set allocation
    let shared = 0, totalUnique = 0
    for (const t of ALL_MYTH_TYPES) {
      let inA = false, inB = false
      for (let _i = 0; _i < a.length; _i++) { if (a[_i].type === t) { inA = true; break } }
      for (let _i = 0; _i < b.length; _i++) { if (b[_i].type === t) { inB = true; break } }
      if (inA || inB) totalUnique++
      if (inA && inB) shared++
    }
    return totalUnique > 0 ? shared / totalUnique : 0
  }

  setSelectedCiv(civId: number): void { this.selectedCivId = civId }

  /* ── 更新 ── */

  update(tick: number, civIds: Iterable<number>): void {
    this.tickCounter++
    if (this.tickCounter % GEN_INTERVAL !== 0) return

    for (const civId of civIds) {
      let civMyths = this.myths.get(civId)
      if (!civMyths) {
        civMyths = []
        this.myths.set(civId, civMyths)
      }
      if (civMyths.length >= MAX_MYTHS_PER_CIV) continue

      // 新文明优先生成创世和起源神话
      const types = MYTH_TYPES
      let hasCreation = false, hasOrigin = false
      for (const m of civMyths) {
        if (m.type === 'creation') hasCreation = true
        else if (m.type === 'origin') hasOrigin = true
      }
      let type: MythType
      if (!hasCreation) type = 'creation'
      else if (!hasOrigin) type = 'origin'
      else type = types[Math.floor(Math.random() * types.length)]

      const tmpl = MYTH_TEMPLATES[type]
      const title = tmpl.titles[Math.floor(Math.random() * tmpl.titles.length)]
      const text = tmpl.texts[Math.floor(Math.random() * tmpl.texts.length)]

      civMyths.push({
        id: nextMythId++, type, title, text, civId,
        createdTick: tick, belief: 0.5 + Math.random() * 0.5,
        historical: Math.random() < 0.3,
        truncText: text.length > 40 ? text.slice(0, 40) + '...' : text,
      })
    }

    // 信仰衰减
    for (const civMyths of this.myths.values()) {
      for (const m of civMyths) {
        m.belief = Math.max(0.1, m.belief - 0.001)
      }
    }
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'Y') {
      this.visible = !this.visible
      this.scrollY = 0
      return true
    }
    return false
  }

  handleMouseDown(mx: number, my: number): boolean {
    if (!this.visible) return false
    if (mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY && my <= this.panelY + HEADER_H) {
      this.dragging = true; this.dragOX = mx - this.panelX; this.dragOY = my - this.panelY; return true
    }
    return mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY && my <= this.panelY + PANEL_H
  }

  handleMouseMove(mx: number, my: number): boolean {
    if (this.dragging) { this.panelX = mx - this.dragOX; this.panelY = my - this.dragOY; return true }
    return false
  }

  handleMouseUp(): boolean { if (this.dragging) { this.dragging = false; return true } return false }

  handleWheel(mx: number, my: number, dy: number): boolean {
    if (!this.visible) return false
    if (mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY + HEADER_H && my <= this.panelY + PANEL_H) {
      const myths = this.myths.get(this.selectedCivId) ?? []
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, myths.length * ROW_H - (PANEL_H - HEADER_H - TAB_H)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY
    const myths = this.myths.get(this.selectedCivId) ?? []

    ctx.fillStyle = 'rgba(10,8,18,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(60,40,70,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#e8d0ff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    if (this.selectedCivId !== this._prevMythCivId || myths.length !== this._prevMythCount) { this._prevMythCivId = this.selectedCivId; this._prevMythCount = myths.length; this._headerStr = `\u{1F4D6} 文明神话 (${myths.length} 篇)` }
    ctx.fillText(this._headerStr, px + 12, py + 24)

    if (myths.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText(this.selectedCivId < 0 ? '未选中文明' : '尚无神话传说', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + 4 - this.scrollY
    for (let i = 0; i < myths.length; i++) {
      const m = myths[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(40,30,55,0.4)' : 'rgba(30,25,45,0.4)'
        ctx.fillRect(px + 4, drawY, PANEL_W - 8, ROW_H - 2)

        ctx.font = '18px sans-serif'
        ctx.fillText(TYPE_ICONS[m.type], px + 10, drawY + 24)

        ctx.fillStyle = '#ddc0ff'
        ctx.font = 'bold 13px monospace'
        ctx.fillText(m.title, px + 38, drawY + 20)

        ctx.fillStyle = '#aaa'
        ctx.font = '11px monospace'
        ctx.fillText(m.truncText, px + 38, drawY + 38)

        // 信仰条
        ctx.fillStyle = 'rgba(50,40,60,0.5)'
        ctx.fillRect(px + 38, drawY + 50, 120, 5)
        ctx.fillStyle = BELIEF_COLORS[Math.min(100, Math.round(m.belief * 100))]
        ctx.fillRect(px + 38, drawY + 50, 120 * m.belief, 5)

        ctx.fillStyle = '#777'; ctx.font = '10px monospace'
        ctx.fillText(m.historical ? '\u{1F4DC} 史实' : '\u{2728} 传说', px + 170, drawY + 58)
      }
      drawY += ROW_H
    }

    ctx.restore()
    ctx.textAlign = 'left'
  }
}
