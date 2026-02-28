/**
 * CreaturePersonalitySystem - 生物性格系统 (v2.00)
 *
 * 每个生物拥有独特的性格特质组合，影响行为决策。
 * 特质包括：勇敢/胆小、友善/敌对、勤劳/懒惰、好奇/保守、忠诚/叛逆。
 * 按 Shift+J 查看性格面板。
 */

/** 性格维度 */
type TraitAxis = 'bravery' | 'kindness' | 'diligence' | 'curiosity' | 'loyalty'

/** 性格档案 */
interface Personality {
  entityId: number
  /** 各维度值 -1 到 1 */
  traits: Record<TraitAxis, number>
  /** 情绪稳定性 0-1 */
  stability: number
  /** 社交倾向 -1(独行) 到 1(群居) */
  sociability: number
  /** Pre-computed render strings — avoids toFixed per frame */
  traitStrs: Record<TraitAxis, string>
  sociabilityStr: string
  stabilityStr: string
  /** Pre-computed social+stability display string — rebuilt when sociability/stability changes */
  socialStr: string
}

const TRAIT_INFO: Record<TraitAxis, { icon: string; labelPos: string; labelNeg: string }> = {
  bravery:   { icon: '\u{1F981}', labelPos: '勇敢', labelNeg: '胆小' },
  kindness:  { icon: '\u{1F49A}', labelPos: '友善', labelNeg: '敌对' },
  diligence: { icon: '\u{1F528}', labelPos: '勤劳', labelNeg: '懒惰' },
  curiosity: { icon: '\u{1F50D}', labelPos: '好奇', labelNeg: '保守' },
  loyalty:   { icon: '\u{1F6E1}\u{FE0F}', labelPos: '忠诚', labelNeg: '叛逆' },
}

const AXES: TraitAxis[] = ['bravery', 'kindness', 'diligence', 'curiosity', 'loyalty']

const PANEL_W = 380, PANEL_H = 360, HEADER_H = 36, ROW_H = 48
const DRIFT_INTERVAL = 300

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

function _buildStrs(p: Personality): void {
  for (const axis of AXES) p.traitStrs[axis] = p.traits[axis].toFixed(2)
  p.sociabilityStr = p.sociability.toFixed(2)
  p.stabilityStr = (p.stability * 100).toFixed(0)
  const socLabel = p.sociability > 0.3 ? '群居' : p.sociability < -0.3 ? '独行' : '中性'
  p.socialStr = `社交: ${socLabel} (${p.sociabilityStr})  稳定性: ${p.stabilityStr}%`
}

export class CreaturePersonalitySystem {
  private personalities = new Map<number, Personality>()
  private visible = false
  private panelX = 130
  private panelY = 65
  private scrollY = 0
  private selectedEntity = -1
  private tickCounter = 0
  private _biasesBuf = [
    { label: '战斗', val: 0, valStr: '', lineStr: '' },
    { label: '逃跑', val: 0, valStr: '', lineStr: '' },
    { label: '助人', val: 0, valStr: '', lineStr: '' },
    { label: '探索', val: 0, valStr: '', lineStr: '' },
    { label: '劳作', val: 0, valStr: '', lineStr: '' },
  ]

  /* ── 公共 API ── */

  /** 为生物生成随机性格 */
  assign(entityId: number): Personality {
    const existing = this.personalities.get(entityId)
    if (existing) return existing
    const p: Personality = {
      entityId,
      traits: {
        bravery: (Math.random() - 0.5) * 2,
        kindness: (Math.random() - 0.5) * 2,
        diligence: (Math.random() - 0.5) * 2,
        curiosity: (Math.random() - 0.5) * 2,
        loyalty: (Math.random() - 0.5) * 2,
      },
      stability: 0.3 + Math.random() * 0.7,
      sociability: (Math.random() - 0.5) * 2,
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: '',
    }
    _buildStrs(p)
    this.personalities.set(entityId, p)
    return p
  }

  /** 基于父母遗传性格 */
  inherit(childId: number, parentA: number, parentB: number): Personality {
    const a = this.personalities.get(parentA)
    const b = this.personalities.get(parentB)
    const traits = {} as Record<TraitAxis, number>
    for (const axis of AXES) {
      const va = a?.traits[axis] ?? (Math.random() - 0.5) * 2
      const vb = b?.traits[axis] ?? (Math.random() - 0.5) * 2
      // 遗传 + 变异
      traits[axis] = clamp((va + vb) / 2 + (Math.random() - 0.5) * 0.4, -1, 1)
    }
    const p: Personality = {
      entityId: childId, traits,
      stability: clamp(((a?.stability ?? 0.5) + (b?.stability ?? 0.5)) / 2 + (Math.random() - 0.5) * 0.2, 0, 1),
      sociability: clamp(((a?.sociability ?? 0) + (b?.sociability ?? 0)) / 2 + (Math.random() - 0.5) * 0.3, -1, 1),
      traitStrs: { bravery: '', kindness: '', diligence: '', curiosity: '', loyalty: '' },
      sociabilityStr: '', stabilityStr: '', socialStr: '',
    }
    _buildStrs(p)
    this.personalities.set(childId, p)
    return p
  }

  /** 获取性格 */
  get(entityId: number): Personality | undefined {
    return this.personalities.get(entityId)
  }

  /** 获取特质值 */
  getTrait(entityId: number, axis: TraitAxis): number {
    return this.personalities.get(entityId)?.traits[axis] ?? 0
  }

  /** 行为决策修正：返回 -1 到 1 的倾向值 */
  getDecisionBias(entityId: number, situation: 'fight' | 'flee' | 'help' | 'explore' | 'work'): number {
    const p = this.personalities.get(entityId)
    if (!p) return 0
    switch (situation) {
      case 'fight': return p.traits.bravery * 0.6 + p.traits.loyalty * 0.3
      case 'flee': return -p.traits.bravery * 0.7 + (1 - p.stability) * 0.3
      case 'help': return p.traits.kindness * 0.7 + p.sociability * 0.2
      case 'explore': return p.traits.curiosity * 0.8
      case 'work': return p.traits.diligence * 0.7 + p.traits.loyalty * 0.2
    }
  }

  /** 移除实体 */
  remove(entityId: number): void {
    this.personalities.delete(entityId)
  }

  setSelectedEntity(id: number): void { this.selectedEntity = id }

  /* ── 更新 ── */

  update(tick: number): void {
    this.tickCounter++
    if (this.tickCounter % DRIFT_INTERVAL !== 0) return

    // 性格微漂移（经历影响性格）
    for (const p of this.personalities.values()) {
      for (const axis of AXES) {
        p.traits[axis] = clamp(p.traits[axis] + (Math.random() - 0.5) * 0.02 * (1 - p.stability), -1, 1)
      }
      _buildStrs(p)
    }
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'J') {
      this.visible = !this.visible
      this.scrollY = 0
      return true
    }
    return false
  }

  handleWheel(mx: number, my: number, dy: number): boolean {
    if (!this.visible) return false
    if (mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY + HEADER_H && my <= this.panelY + PANEL_H) {
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, AXES.length * ROW_H - (PANEL_H - HEADER_H - 80)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY
    const p = this.personalities.get(this.selectedEntity)

    ctx.fillStyle = 'rgba(8,10,15,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(40,50,70,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#b0d0ff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`\u{1F9E0} 生物性格`, px + 12, py + 24)

    if (!p) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('未选中生物', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    let drawY = py + HEADER_H + 16

    // 社交倾向和稳定性
    ctx.fillStyle = '#aac'; ctx.font = '12px monospace'
    ctx.fillText(p.socialStr, px + 16, drawY)
    drawY += 24

    // 各维度条
    for (const axis of AXES) {
      const info = TRAIT_INFO[axis]
      const val = p.traits[axis]

      ctx.font = '16px sans-serif'
      ctx.fillText(info.icon, px + 12, drawY + 4)

      // 负面标签
      ctx.fillStyle = val < -0.2 ? '#ff9090' : '#777'
      ctx.font = '11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(info.labelNeg, px + 90, drawY + 4)

      // 条形图：中间为 0，左负右正
      const barX = px + 100, barW = 180, barH = 10
      const midX = barX + barW / 2
      ctx.fillStyle = 'rgba(40,45,55,0.5)'
      ctx.fillRect(barX, drawY - 4, barW, barH)

      // 中线
      ctx.fillStyle = 'rgba(100,100,120,0.5)'
      ctx.fillRect(midX - 1, drawY - 4, 2, barH)

      // 值条
      const fillW = (val / 2) * barW
      if (val >= 0) {
        ctx.fillStyle = 'hsl(210,60%,55%)'
        ctx.fillRect(midX, drawY - 4, fillW, barH)
      } else {
        ctx.fillStyle = 'hsl(0,50%,55%)'
        ctx.fillRect(midX + fillW, drawY - 4, -fillW, barH)
      }

      // 正面标签
      ctx.fillStyle = val > 0.2 ? '#90c0ff' : '#777'
      ctx.textAlign = 'left'
      ctx.fillText(info.labelPos, px + 290, drawY + 4)

      // 数值
      ctx.fillStyle = '#999'; ctx.font = '10px monospace'
      ctx.fillText(p.traitStrs[axis], px + 340, drawY + 4)

      drawY += ROW_H
    }

    // 行为倾向摘要
    drawY += 8
    ctx.fillStyle = 'rgba(40,50,70,0.4)'
    ctx.fillRect(px + 8, drawY - 12, PANEL_W - 16, 50)
    ctx.fillStyle = '#8ab'; ctx.font = '11px monospace'
    ctx.fillText('行为倾向:', px + 16, drawY + 2)
    const biases = this._biasesBuf
    const _setB = (b: typeof biases[0], v: number) => { b.val = v; b.valStr = v.toFixed(2); b.lineStr = `${b.label}:${v > 0 ? '+' : ''}${b.valStr}` }
    _setB(biases[0], this.getDecisionBias(p.entityId, 'fight'))
    _setB(biases[1], this.getDecisionBias(p.entityId, 'flee'))
    _setB(biases[2], this.getDecisionBias(p.entityId, 'help'))
    _setB(biases[3], this.getDecisionBias(p.entityId, 'explore'))
    _setB(biases[4], this.getDecisionBias(p.entityId, 'work'))
    let bx = px + 16
    ctx.font = '10px monospace'
    for (const b of biases) {
      ctx.fillStyle = b.val > 0.2 ? '#8c8' : b.val < -0.2 ? '#c88' : '#888'
      ctx.fillText(b.lineStr, bx, drawY + 20)
      bx += 70
    }

    ctx.textAlign = 'left'
  }
}
