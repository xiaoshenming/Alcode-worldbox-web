/**
 * CreatureTamingSystem - 生物驯化系统 (v1.97)
 *
 * 生物可以驯化野生动物作为坐骑或工作伙伴。
 * 驯化需要时间和食物，驯化后的动物跟随主人行动。
 * 按 Shift+T 查看驯化面板。
 */

/** 驯化状态 */
const enum TameState {
  Wild = 0,
  Taming = 1,
  Tamed = 2,
}

/** 可驯化动物类型 */
type AnimalType = 'wolf' | 'horse' | 'bear' | 'eagle' | 'boar' | 'deer'

/** 驯化记录 */
interface TameRecord {
  animalId: number
  ownerId: number
  animalType: AnimalType
  state: TameState
  /** 驯化进度 0-1 */
  progress: number
  /** 驯化开始 tick */
  startTick: number
  /** 动物名字 */
  name: string
  /** 忠诚度 0-1 */
  loyalty: number
}

const ANIMAL_INFO: Record<AnimalType, { icon: string; label: string; tameTicks: number; bonus: string }> = {
  wolf: { icon: '\u{1F43A}', label: '狼', tameTicks: 300, bonus: '战斗+15%' },
  horse: { icon: '\u{1F40E}', label: '马', tameTicks: 200, bonus: '移速+40%' },
  bear: { icon: '\u{1F43B}', label: '熊', tameTicks: 500, bonus: '攻击+25%' },
  eagle: { icon: '\u{1F985}', label: '鹰', tameTicks: 400, bonus: '视野+5' },
  boar: { icon: '\u{1F417}', label: '野猪', tameTicks: 250, bonus: '采集+20%' },
  deer: { icon: '\u{1F98C}', label: '鹿', tameTicks: 150, bonus: '移速+20%' },
}

const NAMES = ['影牙', '疾风', '铁蹄', '雷鸣', '银爪', '烈焰', '霜刃', '暗影', '金瞳', '碧眼']

const PANEL_W = 400, PANEL_H = 360, HEADER_H = 36, ROW_H = 56
const TAME_CHECK_INTERVAL = 30

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

export class CreatureTamingSystem {
  private records: TameRecord[] = []
  private visible = false
  private selectedOwner = -1
  private panelX = 100
  private panelY = 70
  private scrollY = 0
  private dragging = false
  private dragOX = 0
  private _renderBuf: TameRecord[] = []
  private dragOY = 0

  /* ── 公共 API ── */

  /** 开始驯化 */
  startTaming(ownerId: number, animalId: number, animalType: AnimalType, tick: number): void {
    // 检查是否已在驯化
    if (this.records.some(r => r.animalId === animalId)) return
    this.records.push({
      animalId, ownerId, animalType, state: TameState.Taming,
      progress: 0, startTick: tick,
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      loyalty: 0.3,
    })
  }

  private _tamedAnimalsBuf: TameRecord[] = []
  /** 获取某生物的驯化动物 */
  getTamedAnimals(ownerId: number): readonly TameRecord[] {
    this._tamedAnimalsBuf.length = 0
    for (const r of this.records) { if (r.ownerId === ownerId && r.state === TameState.Tamed) this._tamedAnimalsBuf.push(r) }
    return this._tamedAnimalsBuf
  }

  /** 检查动物是否已被驯化 */
  isTamed(animalId: number): boolean {
    return this.records.some(r => r.animalId === animalId && r.state === TameState.Tamed)
  }

  /** 获取驯化加成 */
  getBonus(ownerId: number, bonusType: string): number {
    let total = 0
    for (const r of this.records) {
      if (r.ownerId !== ownerId || r.state !== TameState.Tamed) continue
      const info = ANIMAL_INFO[r.animalType]
      if (info.bonus.includes(bonusType)) {
        const match = info.bonus.match(/(\d+)%/)
        if (match) total += parseInt(match[1], 10) / 100
      }
    }
    return total
  }

  /** 移除死亡实体相关记录 */
  removeEntity(entityId: number): void {
    for (let i = this.records.length - 1; i >= 0; i--) {
      if (this.records[i].animalId === entityId || this.records[i].ownerId === entityId) {
        this.records[i] = this.records[this.records.length - 1]
        this.records.pop()
      }
    }
  }

  setSelectedOwner(id: number): void { this.selectedOwner = id }

  /* ── 更新 ── */

  update(tick: number): void {
    if (tick % TAME_CHECK_INTERVAL !== 0) return

    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i]
      if (r.state === TameState.Taming) {
        const info = ANIMAL_INFO[r.animalType]
        r.progress = clamp((tick - r.startTick) / info.tameTicks, 0, 1)
        if (r.progress >= 1) {
          r.state = TameState.Tamed
          r.loyalty = 0.6 + Math.random() * 0.3
        }
      } else if (r.state === TameState.Tamed) {
        // 忠诚度缓慢衰减
        r.loyalty = Math.max(0.1, r.loyalty - 0.0005)
        // 极低忠诚度时可能逃跑
        if (r.loyalty < 0.15 && Math.random() < 0.01) {
          r.state = TameState.Wild
          this.records[i] = this.records[this.records.length - 1]
          this.records.pop()
        }
      }
    }
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'T') {
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
      let count = 0
      for (const r of this.records) { if (r.ownerId === this.selectedOwner) count++ }
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, count * ROW_H - (PANEL_H - HEADER_H)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY
    this._renderBuf.length = 0
    for (const r of this.records) {
      if (r.ownerId === this.selectedOwner || this.selectedOwner < 0) this._renderBuf.push(r)
    }
    const items = this._renderBuf

    ctx.fillStyle = 'rgba(12,10,8,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(60,50,30,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#ffe0a0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`\u{1F43E} 驯化动物 (${items.length})`, px + 12, py + 24)

    if (items.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('暂无驯化记录', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + 4 - this.scrollY
    for (let i = 0; i < items.length; i++) {
      const r = items[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        const info = ANIMAL_INFO[r.animalType]
        ctx.fillStyle = i % 2 === 0 ? 'rgba(40,35,20,0.4)' : 'rgba(30,28,15,0.4)'
        ctx.fillRect(px + 4, drawY, PANEL_W - 8, ROW_H - 2)

        ctx.font = '20px sans-serif'
        ctx.fillText(info.icon, px + 10, drawY + 28)

        ctx.fillStyle = r.state === TameState.Tamed ? '#ffe0a0' : '#aaa'
        ctx.font = 'bold 12px monospace'
        ctx.fillText(`${r.name} (${info.label})`, px + 38, drawY + 18)

        ctx.fillStyle = '#999'; ctx.font = '11px monospace'
        const stateLabel = r.state === TameState.Taming ? `驯化中 ${(r.progress * 100).toFixed(0)}%` : `已驯化 | ${info.bonus}`
        ctx.fillText(stateLabel, px + 38, drawY + 34)

        // 忠诚度/进度条
        const barVal = r.state === TameState.Tamed ? r.loyalty : r.progress
        ctx.fillStyle = 'rgba(50,45,30,0.5)'
        ctx.fillRect(px + 38, drawY + 42, 140, 5)
        ctx.fillStyle = barVal > 0.5 ? 'hsl(40,70%,55%)' : barVal > 0.25 ? 'hsl(20,70%,55%)' : 'hsl(0,70%,55%)'
        ctx.fillRect(px + 38, drawY + 42, 140 * barVal, 5)
      }
      drawY += ROW_H
    }

    ctx.restore()
    ctx.textAlign = 'left'
  }
}
