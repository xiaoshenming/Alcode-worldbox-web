/**
 * MonumentSystem - 世界纪念碑系统 (v1.99)
 *
 * 文明可以建造纪念碑，提供区域增益效果。
 * 纪念碑类型包括：方尖碑、雕像、神殿、凯旋门、灯塔。
 * 按 Shift+U 查看纪念碑面板。
 */

/** 纪念碑类型 */
type MonumentType = 'obelisk' | 'statue' | 'temple' | 'arch' | 'lighthouse'

/** 增益类型 */
type BuffType = 'morale' | 'production' | 'defense' | 'culture' | 'vision'

/** 纪念碑 */
interface Monument {
  id: number
  type: MonumentType
  name: string
  civId: number
  x: number
  y: number
  /** 建造进度 0-1 */
  buildProgress: number
  /** 耐久度 0-1 */
  durability: number
  /** 增益半径 */
  radius: number
  /** 增益效果 */
  buffs: { type: BuffType; value: number }[]
  /** 建造 tick */
  createdTick: number
  /** 是否已完工 */
  completed: boolean
}

const MONUMENT_INFO: Record<MonumentType, { icon: string; label: string; buildTicks: number; radius: number; buffs: { type: BuffType; value: number }[] }> = {
  obelisk:    { icon: '\u{1F5FC}', label: '方尖碑', buildTicks: 800, radius: 10, buffs: [{ type: 'culture', value: 0.15 }] },
  statue:     { icon: '\u{1F5FF}', label: '巨像', buildTicks: 1200, radius: 8, buffs: [{ type: 'morale', value: 0.2 }] },
  temple:     { icon: '\u{26E9}\u{FE0F}', label: '神殿', buildTicks: 1500, radius: 12, buffs: [{ type: 'morale', value: 0.1 }, { type: 'culture', value: 0.1 }] },
  arch:       { icon: '\u{1F3DB}\u{FE0F}', label: '凯旋门', buildTicks: 600, radius: 6, buffs: [{ type: 'defense', value: 0.15 }] },
  lighthouse: { icon: '\u{1F6E4}\u{FE0F}', label: '灯塔', buildTicks: 500, radius: 15, buffs: [{ type: 'vision', value: 0.25 }] },
}

const PANEL_W = 420, PANEL_H = 380, HEADER_H = 36, ROW_H = 68
const BUILD_CHECK_INTERVAL = 60

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

let nextMonumentId = 1

export class MonumentSystem {
  private monuments: Monument[] = []
  private visible = false
  private panelX = 110
  private panelY = 55
  private scrollY = 0
  private _lastZoom = -1
  private _iconFont = ''

  /* ── 公共 API ── */

  /** 开始建造纪念碑 */
  build(civId: number, type: MonumentType, x: number, y: number, tick: number): Monument {
    const info = MONUMENT_INFO[type]
    const m: Monument = {
      id: nextMonumentId++, type, name: `${info.label}#${nextMonumentId - 1}`,
      civId, x, y, buildProgress: 0, durability: 1,
      radius: info.radius, buffs: [...info.buffs],
      createdTick: tick, completed: false,
    }
    this.monuments.push(m)
    return m
  }

  /** 获取某位置的增益 */
  getBuffsAt(x: number, y: number): { type: BuffType; value: number }[] {
    const result: { type: BuffType; value: number }[] = []
    for (const m of this.monuments) {
      if (!m.completed) continue
      const dx = m.x - x, dy = m.y - y
      if (dx * dx + dy * dy <= m.radius * m.radius) {
        for (const b of m.buffs) result.push(b)
      }
    }
    return result
  }

  private _civMonumentsBuf: Monument[] = []
  private _completedMonumentsBuf: Monument[] = []
  /** 获取某文明的纪念碑 */
  getMonumentsForCiv(civId: number): readonly Monument[] {
    this._civMonumentsBuf.length = 0
    for (const m of this.monuments) { if (m.civId === civId) this._civMonumentsBuf.push(m) }
    return this._civMonumentsBuf
  }

  /** 获取所有已完工纪念碑 */
  getCompletedMonuments(): readonly Monument[] {
    this._completedMonumentsBuf.length = 0
    for (const m of this.monuments) { if (m.completed) this._completedMonumentsBuf.push(m) }
    return this._completedMonumentsBuf
  }

  /** 对纪念碑造成伤害 */
  damage(monumentId: number, amount: number): void {
    const m = this.monuments.find(m => m.id === monumentId)
    if (m) {
      m.durability = Math.max(0, m.durability - amount)
      if (m.durability <= 0) {
        const idx = this.monuments.indexOf(m)
        if (idx >= 0) { this.monuments[idx] = this.monuments[this.monuments.length - 1]; this.monuments.pop() }
      }
    }
  }

  /* ── 更新 ── */

  update(tick: number): void {
    if (tick % BUILD_CHECK_INTERVAL !== 0) return

    for (const m of this.monuments) {
      if (!m.completed) {
        const info = MONUMENT_INFO[m.type]
        m.buildProgress = clamp((tick - m.createdTick) / info.buildTicks, 0, 1)
        if (m.buildProgress >= 1) m.completed = true
      } else {
        // 缓慢老化
        m.durability = Math.max(0.1, m.durability - 0.0002)
      }
    }
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'U') {
      this.visible = !this.visible
      this.scrollY = 0
      return true
    }
    return false
  }

  handleWheel(mx: number, my: number, dy: number): boolean {
    if (!this.visible) return false
    if (mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY + HEADER_H && my <= this.panelY + PANEL_H) {
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, this.monuments.length * ROW_H - (PANEL_H - HEADER_H)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY

    ctx.fillStyle = 'rgba(10,12,8,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(50,60,40,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#d0e8b0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    let done = 0
    for (let _mi = 0; _mi < this.monuments.length; _mi++) { if (this.monuments[_mi].completed) done++ }
    ctx.fillText(`\u{1F3DB}\u{FE0F} 纪念碑 (${done}/${this.monuments.length})`, px + 12, py + 24)

    if (this.monuments.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('暂无纪念碑', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + 4 - this.scrollY
    for (let i = 0; i < this.monuments.length; i++) {
      const m = this.monuments[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        const info = MONUMENT_INFO[m.type]
        ctx.fillStyle = i % 2 === 0 ? 'rgba(35,40,28,0.4)' : 'rgba(28,32,22,0.4)'
        ctx.fillRect(px + 4, drawY, PANEL_W - 8, ROW_H - 2)

        ctx.font = '20px sans-serif'
        ctx.fillText(info.icon, px + 10, drawY + 28)

        ctx.fillStyle = m.completed ? '#d0e8b0' : '#aaa'
        ctx.font = 'bold 12px monospace'
        ctx.fillText(`${m.name} (${info.label})`, px + 38, drawY + 18)

        ctx.fillStyle = '#999'; ctx.font = '11px monospace'
        const status = m.completed ? `已完工 | 半径${m.radius}` : `建造中 ${(m.buildProgress * 100).toFixed(0)}%`
        ctx.fillText(status, px + 38, drawY + 34)

        // 增益标签
        let bx = px + 38
        ctx.font = '10px monospace'
        for (const b of m.buffs) {
          ctx.fillStyle = '#8c8'
          ctx.fillText(`${b.type}+${(b.value * 100).toFixed(0)}%`, bx, drawY + 48)
          bx += 80
        }

        // 耐久度条
        ctx.fillStyle = 'rgba(40,45,30,0.5)'
        ctx.fillRect(px + 38, drawY + 56, 120, 5)
        ctx.fillStyle = m.durability > 0.5 ? 'hsl(100,60%,50%)' : m.durability > 0.25 ? 'hsl(50,60%,50%)' : 'hsl(0,60%,50%)'
        ctx.fillRect(px + 38, drawY + 56, 120 * m.durability, 5)
      }
      drawY += ROW_H
    }

    ctx.restore()
    ctx.textAlign = 'left'
  }

  /** 在世界地图上渲染纪念碑图标 */
  renderWorld(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, tileSize: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._iconFont = `${Math.max(12, 16 * zoom)}px sans-serif`
    }
    for (const m of this.monuments) {
      if (!m.completed) continue
      const sx = (m.x * tileSize - camX) * zoom
      const sy = (m.y * tileSize - camY) * zoom
      const info = MONUMENT_INFO[m.type]

      // 增益范围圈
      ctx.strokeStyle = 'rgba(180,220,140,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(sx, sy, m.radius * tileSize * zoom, 0, Math.PI * 2)
      ctx.stroke()

      // 图标
      ctx.font = this._iconFont
      ctx.textAlign = 'center'
      ctx.fillText(info.icon, sx, sy + 4)
    }
    ctx.textAlign = 'left'
  }
}
