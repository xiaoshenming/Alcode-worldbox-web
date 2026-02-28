/**
 * WorldNarratorSystem - 世界叙事系统 (v1.95)
 *
 * 自动生成描述世界重大事件的叙事文本，以滚动日志形式展示。
 * 支持战争、灾难、文明兴衰、英雄事迹等叙事模板。
 * 按 N 键打开/关闭叙事面板。
 */

/** 叙事条目类型 */
type NarrativeType = 'war' | 'disaster' | 'rise' | 'fall' | 'hero' | 'discovery' | 'peace' | 'birth' | 'death' | 'wonder'

/** 单条叙事 */
interface NarrativeEntry {
  id: number
  type: NarrativeType
  text: string
  tick: number
  /** Pre-computed "tick ${tick}" display string */
  tickStr: string
  /** 重要程度 1-5 */
  importance: number
  /** 是否已读 */
  read: boolean
}

/** 叙事模板 */
interface NarrativeTemplate {
  type: NarrativeType
  patterns: string[]
}

const TEMPLATES: NarrativeTemplate[] = [
  { type: 'war', patterns: [
    '{civ1}向{civ2}宣战，战火蔓延至{loc}',
    '{civ1}与{civ2}的边境冲突升级为全面战争',
    '血腥的{loc}之战拉开序幕，双方投入大量兵力',
  ]},
  { type: 'disaster', patterns: [
    '一场毁灭性的{disaster}袭击了{loc}，造成严重破坏',
    '{loc}遭遇百年不遇的{disaster}，居民四散逃离',
    '天降{disaster}，{loc}化为废墟',
  ]},
  { type: 'rise', patterns: [
    '{civ1}进入黄金时代，国力空前强盛',
    '{civ1}的人口突破{num}，成为最大的文明',
    '{civ1}完成了伟大的技术突破，文明跃升新纪元',
  ]},
  { type: 'fall', patterns: [
    '{civ1}的最后一座城市陷落，文明就此消亡',
    '曾经辉煌的{civ1}在内忧外患中走向衰落',
    '{civ1}因资源枯竭而逐渐衰败',
  ]},
  { type: 'hero', patterns: [
    '英雄{name}在{loc}击败了强大的敌人，名声远扬',
    '传奇战士{name}单枪匹马守住了{loc}',
    '{name}被{civ1}的人民尊为救世英雄',
  ]},
  { type: 'discovery', patterns: [
    '{civ1}的探险家发现了新的{resource}矿脉',
    '一片未知的土地被{civ1}的先驱者发现',
    '{civ1}研发出了新的{tech}技术',
  ]},
  { type: 'peace', patterns: [
    '{civ1}与{civ2}签订和平条约，结束了漫长的战争',
    '和平降临{loc}，人民终于可以安居乐业',
    '{civ1}与{civ2}结成同盟，共同抵御外敌',
  ]},
  { type: 'wonder', patterns: [
    '{civ1}建造了宏伟的{wonder}，举世瞩目',
    '历经数代人的努力，{wonder}终于在{loc}落成',
  ]},
]

const TYPE_ICONS: Record<NarrativeType, string> = {
  war: '\u{2694}\u{FE0F}', disaster: '\u{1F30B}', rise: '\u{1F31F}', fall: '\u{1F4A8}',
  hero: '\u{1F9B8}', discovery: '\u{1F50D}', peace: '\u{1F54A}\u{FE0F}',
  birth: '\u{1F476}', death: '\u{1F480}', wonder: '\u{1F3DB}\u{FE0F}',
}

const TYPE_COLORS: Record<NarrativeType, string> = {
  war: '#ff4444', disaster: '#ff8844', rise: '#44dd66', fall: '#aa6644',
  hero: '#44aaff', discovery: '#dddd44', peace: '#88ddaa',
  birth: '#ffaacc', death: '#888888', wonder: '#ddaa44',
}

const PANEL_W = 480, PANEL_H = 440, HEADER_H = 36
const MAX_ENTRIES = 100
const ENTRY_PAD = 8

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

let nextNarrId = 1

export class WorldNarratorSystem {
  private entries: NarrativeEntry[] = []
  private visible = false
  private panelX = 120
  private panelY = 40
  private scrollY = 0
  private maxScroll = 0
  private dragging = false
  private dragOX = 0
  private dragOY = 0
  private unreadCount = 0
  private _unreadStr = '0'

  /* ── 公共 API ── */

  /** 添加叙事（由其他系统调用） */
  addNarrative(type: NarrativeType, text: string, tick: number, importance = 3): void {
    this.entries.push({ id: nextNarrId++, type, text, tick, tickStr: `tick ${tick}`, importance, read: false })
    this.unreadCount++
    this._unreadStr = this.unreadCount > 9 ? '9+' : String(this.unreadCount)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift()
    }
  }

  /** 使用模板生成叙事 */
  generate(type: NarrativeType, vars: Record<string, string>, tick: number, importance = 3): void {
    const tmpl = TEMPLATES.find(t => t.type === type)
    if (!tmpl) return
    let text = tmpl.patterns[Math.floor(Math.random() * tmpl.patterns.length)]
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
    }
    // 清除未替换的占位符
    text = text.replace(/\{[^}]+\}/g, '???')
    this.addNarrative(type, text, tick, importance)
  }

  getUnreadCount(): number { return this.unreadCount }
  getEntries(): readonly NarrativeEntry[] { return this.entries }

  /* ── 更新 ── */

  update(): void {
    // 叙事系统是被动的，由外部事件触发
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!e.shiftKey && !e.ctrlKey && !e.altKey && e.key.toUpperCase() === 'N') {
      this.visible = !this.visible
      if (this.visible) {
        // 标记全部已读
        for (let i = 0; i < this.entries.length; i++) this.entries[i].read = true
        this.unreadCount = 0; this._unreadStr = '0'
      }
      return true
    }
    return false
  }

  handleMouseDown(mx: number, my: number): boolean {
    if (!this.visible) return false
    const px = this.panelX, py = this.panelY
    if (mx >= px && mx <= px + PANEL_W && my >= py && my <= py + HEADER_H) {
      this.dragging = true
      this.dragOX = mx - px
      this.dragOY = my - py
      return true
    }
    return mx >= px && mx <= px + PANEL_W && my >= py && my <= py + PANEL_H
  }

  handleMouseMove(mx: number, my: number): boolean {
    if (this.dragging) { this.panelX = mx - this.dragOX; this.panelY = my - this.dragOY; return true }
    return false
  }

  handleMouseUp(): boolean {
    if (this.dragging) { this.dragging = false; return true }
    return false
  }

  handleWheel(mx: number, my: number, dy: number): boolean {
    if (!this.visible) return false
    const px = this.panelX, py = this.panelY
    if (mx >= px && mx <= px + PANEL_W && my >= py + HEADER_H && my <= py + PANEL_H) {
      this.scrollY = clamp(this.scrollY + dy * 0.8, 0, this.maxScroll)
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    // 未读提示（始终显示）
    if (!this.visible && this.unreadCount > 0) {
      this.renderUnreadBadge(ctx)
    }

    if (!this.visible) return
    const px = this.panelX, py = this.panelY

    // 背景
    ctx.fillStyle = 'rgba(8,8,16,0.94)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    // 标题
    ctx.fillStyle = 'rgba(50,40,60,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#ffe0c0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`\u{1F4DC} 世界编年史 (${this.entries.length} 条记录)`, px + 12, py + 24)

    if (this.entries.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('世界尚无重大事件发生...', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    // 裁剪
    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + ENTRY_PAD - this.scrollY
    const contentW = PANEL_W - 20

    // 从最新到最旧
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]
      const entryH = this.measureEntryHeight(ctx, e, contentW)

      if (drawY + entryH > py + HEADER_H && drawY < py + PANEL_H) {
        this.renderEntry(ctx, e, px + 10, drawY, contentW, entryH)
      }
      drawY += entryH + ENTRY_PAD
    }

    this.maxScroll = Math.max(0, drawY + this.scrollY - py - PANEL_H)
    ctx.restore()
    ctx.textAlign = 'left'
  }

  private renderEntry(ctx: CanvasRenderingContext2D, e: NarrativeEntry, x: number, y: number, w: number, h: number): void {
    // 背景
    ctx.globalAlpha = 0.15 + e.importance * 0.05
    ctx.fillStyle = '#28233a'
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill()
    ctx.globalAlpha = 1

    // 左侧色条
    ctx.fillStyle = TYPE_COLORS[e.type]
    ctx.fillRect(x, y, 3, h)

    // 图标
    ctx.font = '16px sans-serif'
    ctx.fillText(TYPE_ICONS[e.type], x + 10, y + 20)

    // tick 时间
    ctx.fillStyle = '#777'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(e.tickStr, x + w - 4, y + 16)
    ctx.textAlign = 'left'

    // 文本
    ctx.fillStyle = '#ddd'
    ctx.font = '12px monospace'
    this.wrapText(ctx, e.text, x + 34, y + 18, w - 44, 16)

    // 重要度星星
    ctx.fillStyle = '#ffcc44'
    ctx.font = '10px sans-serif'
    let stars = ''
    for (let s = 0; s < e.importance; s++) stars += '\u{2B50}'
    ctx.fillText(stars, x + 34, y + h - 6)
  }

  private measureEntryHeight(_ctx: CanvasRenderingContext2D, e: NarrativeEntry, w: number): number {
    const charsPerLine = Math.floor((w - 44) / 7.2)
    const lines = Math.ceil(e.text.length / charsPerLine)
    return Math.max(40, 24 + lines * 16 + 12)
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): void {
    let line = ''
    let cy = y
    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i]
      if (ctx.measureText(testLine).width > maxW && line.length > 0) {
        ctx.fillText(line, x, cy)
        line = text[i]
        cy += lineH
      } else {
        line = testLine
      }
    }
    if (line) ctx.fillText(line, x, cy)
  }

  private renderUnreadBadge(ctx: CanvasRenderingContext2D): void {
    const bx = 10, by = 140, bw = 36, bh = 36
    ctx.fillStyle = 'rgba(80,40,20,0.85)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill()
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('\u{1F4DC}', bx + bw / 2, by + 24)
    // 未读数
    ctx.fillStyle = '#ff4444'
    ctx.beginPath(); ctx.arc(bx + bw - 4, by + 6, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'
    ctx.fillText(this._unreadStr, bx + bw - 4, by + 10)
    ctx.textAlign = 'left'
  }
}
