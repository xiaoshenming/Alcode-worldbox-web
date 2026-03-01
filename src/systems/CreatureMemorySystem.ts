/**
 * CreatureMemorySystem - 生物记忆系统 (v1.91)
 *
 * 生物能记住重要地点（食物源、危险区域、家园）、重大事件（战斗、灾难）
 * 和其他生物（盟友、敌人）。记忆影响 AI 决策，如回避危险区、寻找已知食物源。
 * 按 Shift+M 打开记忆面板查看选中生物的记忆。
 */

/** 记忆类型 */
const enum MemoryType {
  Location = 0,
  Event = 1,
  Creature = 2,
}

/** 地点记忆标签 */
type LocationTag = 'food' | 'danger' | 'home' | 'water' | 'resource' | 'shelter'

/** 事件记忆标签 */
type EventTag = 'battle' | 'disaster' | 'birth' | 'death' | 'discovery' | 'trade'

/** 生物记忆标签 */
type CreatureTag = 'ally' | 'enemy' | 'mate' | 'parent' | 'child' | 'rival'

/** 单条记忆 */
interface Memory {
  id: number
  type: MemoryType
  tag: LocationTag | EventTag | CreatureTag
  /** 记忆关联的世界坐标 */
  x: number
  y: number
  /** Pre-computed coordinate display string — computed at creation, never changes */
  coordStr: string
  /** 记忆产生的 tick */
  tick: number
  /** 记忆强度 0-1，随时间衰减 */
  strength: number
  /** 关联实体 ID（生物记忆时） */
  targetId: number
  /** 简短描述 */
  desc: string
  /** Pre-computed truncated description — at most 30 chars + '...' */
  truncDesc: string
}

/** 单个生物的记忆容器 */
interface CreatureMemoryBank {
  memories: Memory[]
  /** 最近访问的记忆 ID，用于 UI 高亮 */
  lastAccessed: number
}

/** 记忆衰减速率（每 tick） */
const DECAY_RATE = 0.0002
/** 最大记忆数量 */
const MAX_MEMORIES = 24
/** 记忆强度阈值，低于此值被遗忘 */
const FORGET_THRESHOLD = 0.05
/** 面板尺寸 */
const PANEL_W = 420, PANEL_H = 380, HEADER_H = 36, ROW_H = 32
const ICON_MAP: Record<string, string> = {
  food: '\u{1F34E}', danger: '\u{26A0}\u{FE0F}', home: '\u{1F3E0}',
  water: '\u{1F4A7}', resource: '\u{1F48E}', shelter: '\u{26FA}',
  battle: '\u{2694}\u{FE0F}', disaster: '\u{1F300}', birth: '\u{1F476}',
  death: '\u{1F480}', discovery: '\u{1F50D}', trade: '\u{1F4B0}',
  ally: '\u{1F91D}', enemy: '\u{1F608}', mate: '\u{2764}\u{FE0F}',
  parent: '\u{1F468}', child: '\u{1F476}', rival: '\u{1F94A}',
}
const _HSL_GREEN = 'hsl(120,70%,55%)'
const _HSL_YELLOW = 'hsl(60,70%,55%)'
const _HSL_RED = 'hsl(0,70%,55%)'

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

let nextMemId = 1

export class CreatureMemorySystem {
  private banks = new Map<number, CreatureMemoryBank>()
  private visible = false
  private selectedEntity = -1
  private scrollY = 0
  private panelX = 0
  private panelY = 0
  private dragging = false
  private dragOX = 0
  private dragOY = 0
  /** Pre-computed panel header — rebuilt when selected entity or memory count changes */
  private _prevMemEid = -2
  private _prevMemCount = -1
  private _memHeaderStr = '\u{1F9E0} 生物记忆 (0/24)'

  constructor() {
    this.panelX = 60
    this.panelY = 80
  }

  /* ── 公共 API ── */

  /** 添加地点记忆 */
  addLocationMemory(entityId: number, tag: LocationTag, x: number, y: number, tick: number, desc: string): void {
    this.addMemory(entityId, { id: nextMemId++, type: MemoryType.Location, tag, x, y, coordStr: `(${x},${y})`, tick, strength: 1, targetId: -1, desc, truncDesc: desc.length > 30 ? desc.slice(0, 30) + '...' : desc })
  }

  /** 添加事件记忆 */
  addEventMemory(entityId: number, tag: EventTag, x: number, y: number, tick: number, desc: string): void {
    this.addMemory(entityId, { id: nextMemId++, type: MemoryType.Event, tag, x, y, coordStr: `(${x},${y})`, tick, strength: 1, targetId: -1, desc, truncDesc: desc.length > 30 ? desc.slice(0, 30) + '...' : desc })
  }

  /** 查询某生物对另一生物的印象 */
  recallCreature(entityId: number, targetId: number): Memory | null {
    const bank = this.banks.get(entityId)
    if (!bank) return null
    for (let i = 0; i < bank.memories.length; i++) {
      const m = bank.memories[i]
      if (m.type === MemoryType.Creature && m.targetId === targetId) {
        bank.lastAccessed = m.id
        return m
      }
    }
    return null
  }

  /** 获取某生物的全部记忆 */
  getMemories(entityId: number): readonly Memory[] {
    return this.banks.get(entityId)?.memories ?? []
  }

  /** 清除已死亡实体的记忆 */
  removeEntity(entityId: number): void {
    this.banks.delete(entityId)
  }

  setSelectedEntity(id: number): void { this.selectedEntity = id }

  /* ── 更新 ── */

  update(tick: number): void {
    for (const [entityId, bank] of this.banks) {
      for (let i = bank.memories.length - 1; i >= 0; i--) {
        const m = bank.memories[i]
        m.strength -= DECAY_RATE
        if (m.strength < FORGET_THRESHOLD) {
          bank.memories[i] = bank.memories[bank.memories.length - 1]
          bank.memories.pop()
        }
      }
      if (bank.memories.length === 0) this.banks.delete(entityId)
    }
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'M') {
      this.visible = !this.visible
      this.scrollY = 0
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
    if (mx >= px && mx <= px + PANEL_W && my >= py && my <= py + PANEL_H) return true
    return false
  }

  handleMouseMove(mx: number, my: number): boolean {
    if (this.dragging) {
      this.panelX = mx - this.dragOX
      this.panelY = my - this.dragOY
      return true
    }
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
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, MAX_MEMORIES * ROW_H - (PANEL_H - HEADER_H)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const bank = this.banks.get(this.selectedEntity)
    const memories = bank?.memories ?? []
    const px = this.panelX, py = this.panelY

    // 背景
    ctx.fillStyle = 'rgba(15,15,25,0.92)'
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, PANEL_H, 8)
    ctx.fill()

    // 标题栏
    ctx.fillStyle = 'rgba(60,60,90,0.9)'
    ctx.beginPath()
    ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0])
    ctx.fill()
    ctx.fillStyle = '#e0e0ff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    if (this.selectedEntity !== this._prevMemEid || memories.length !== this._prevMemCount) {
      this._prevMemEid = this.selectedEntity; this._prevMemCount = memories.length
      this._memHeaderStr = `\u{1F9E0} 生物记忆 (${memories.length}/${MAX_MEMORIES})`
    }
    ctx.fillText(this._memHeaderStr, px + 12, py + 24)

    if (this.selectedEntity < 0 || memories.length === 0) {
      ctx.fillStyle = '#888'
      ctx.font = '13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(this.selectedEntity < 0 ? '未选中生物' : '暂无记忆', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'
      return
    }

    // 裁剪区域
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H)
    ctx.clip()

    const startY = py + HEADER_H + 4 - this.scrollY
    for (let i = 0; i < memories.length; i++) {
      const m = memories[i]
      const ry = startY + i * ROW_H
      if (ry + ROW_H < py + HEADER_H || ry > py + PANEL_H) continue

      // 行背景
      const isAccessed = bank?.lastAccessed === m.id
      ctx.fillStyle = isAccessed ? 'rgba(80,80,140,0.4)' : (i % 2 === 0 ? 'rgba(40,40,60,0.3)' : 'rgba(30,30,50,0.3)')
      ctx.fillRect(px + 4, ry, PANEL_W - 8, ROW_H - 2)

      // 图标
      const icon = ICON_MAP[m.tag] ?? '\u{2753}'
      ctx.font = '15px sans-serif'
      ctx.fillText(icon, px + 10, ry + 20)

      // 描述
      ctx.fillStyle = '#ccc'
      ctx.font = '12px monospace'
      ctx.fillText(m.truncDesc, px + 34, ry + 15)

      // 强度条
      const barX = px + PANEL_W - 80, barW = 60, barH = 6
      ctx.fillStyle = 'rgba(50,50,70,0.6)'
      ctx.fillRect(barX, ry + 10, barW, barH)
      ctx.globalAlpha = 0.5 + m.strength * 0.5
      ctx.fillStyle = m.strength > 0.5 ? _HSL_GREEN : m.strength > 0.25 ? _HSL_YELLOW : _HSL_RED
      ctx.fillRect(barX, ry + 10, barW * m.strength, barH)
      ctx.globalAlpha = 1

      // 坐标
      ctx.fillStyle = '#777'
      ctx.font = '10px monospace'
      ctx.fillText(m.coordStr, px + 34, ry + 28)
    }

    ctx.restore()
  }

  /* ── 内部 ── */

  private addMemory(entityId: number, mem: Memory): void {
    let bank = this.banks.get(entityId)
    if (!bank) {
      bank = { memories: [], lastAccessed: -1 }
      this.banks.set(entityId, bank)
    }
    // 同类型同标签去重，保留更强的
    for (let i = 0; i < bank.memories.length; i++) {
      const existing = bank.memories[i]
      if (existing.type === mem.type && existing.tag === mem.tag &&
          (mem.type !== MemoryType.Creature || existing.targetId === mem.targetId)) {
        if (mem.strength >= existing.strength) {
          bank.memories[i] = mem
        } else {
          existing.strength = clamp(existing.strength + 0.2, 0, 1)
        }
        return
      }
    }
    if (bank.memories.length >= MAX_MEMORIES) {
      // 淘汰最弱记忆
      let weakIdx = 0, weakStr = bank.memories[0].strength
      for (let i = 1; i < bank.memories.length; i++) {
        if (bank.memories[i].strength < weakStr) {
          weakStr = bank.memories[i].strength
          weakIdx = i
        }
      }
      bank.memories[weakIdx] = mem
    } else {
      bank.memories.push(mem)
    }
  }
}
