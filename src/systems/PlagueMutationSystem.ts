/**
 * PlagueMutationSystem - 瘟疫变异系统 (v1.98)
 *
 * 疾病在传播过程中会变异，产生新的毒株。
 * 变异可能增强传染性、致死率或产生抗药性。
 * 按 Shift+G 查看瘟疫面板。
 */

/** 症状类型 */
type Symptom = 'fever' | 'cough' | 'rash' | 'weakness' | 'madness' | 'blindness'

/** 瘟疫毒株 */
interface PlagueStrain {
  id: number
  name: string
  /** 父毒株 id，0 = 原始 */
  parentId: number
  /** 传染率 0-1 */
  infectRate: number
  /** 致死率 0-1 */
  lethality: number
  /** 变异概率 0-1 */
  mutationRate: number
  /** 症状列表 */
  symptoms: Symptom[]
  /** 感染人数 */
  infected: number
  /** 死亡人数 */
  deaths: number
  /** 产生 tick */
  createdTick: number
  /** 是否已灭绝 */
  extinct: boolean
}

const SYMPTOM_INFO: Record<Symptom, { icon: string; label: string; lethalityMod: number }> = {
  fever:    { icon: '\u{1F321}\u{FE0F}', label: '发热', lethalityMod: 0.05 },
  cough:    { icon: '\u{1F637}', label: '咳嗽', lethalityMod: 0.02 },
  rash:     { icon: '\u{1F534}', label: '皮疹', lethalityMod: 0.01 },
  weakness: { icon: '\u{1F4A4}', label: '虚弱', lethalityMod: 0.08 },
  madness:  { icon: '\u{1F635}', label: '疯狂', lethalityMod: 0.12 },
  blindness:{ icon: '\u{1F441}\u{FE0F}', label: '失明', lethalityMod: 0.03 },
}

const PLAGUE_NAMES_PREFIX = ['黑', '红', '白', '灰', '暗', '血', '影', '毒']
const PLAGUE_NAMES_SUFFIX = ['热病', '瘟疫', '腐蚀', '枯萎', '疫症', '毒雾']

const PANEL_W = 440, PANEL_H = 400, HEADER_H = 36, ROW_H = 72
const MUTATION_CHECK_INTERVAL = 600
const MAX_STRAINS = 20

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

let nextStrainId = 1

function randomName(): string {
  return PLAGUE_NAMES_PREFIX[Math.floor(Math.random() * PLAGUE_NAMES_PREFIX.length)] +
    PLAGUE_NAMES_SUFFIX[Math.floor(Math.random() * PLAGUE_NAMES_SUFFIX.length)]
}

export class PlagueMutationSystem {
  private strains: PlagueStrain[] = []
  private visible = false
  private panelX = 120
  private panelY = 60
  private scrollY = 0
  private tickCounter = 0

  /* ── 公共 API ── */

  /** 创建原始毒株 */
  createStrain(tick: number, symptoms?: Symptom[]): PlagueStrain {
    const syms: Symptom[] = symptoms ?? [this.randomSymptom()]
    const strain: PlagueStrain = {
      id: nextStrainId++,
      name: randomName(),
      parentId: 0,
      infectRate: 0.1 + Math.random() * 0.3,
      lethality: syms.reduce((s, sy) => s + SYMPTOM_INFO[sy].lethalityMod, 0.02),
      mutationRate: 0.05 + Math.random() * 0.1,
      symptoms: syms,
      infected: 0, deaths: 0,
      createdTick: tick, extinct: false,
    }
    this.strains.push(strain)
    return strain
  }

  /** 获取活跃毒株 */
  getActiveStrains(): readonly PlagueStrain[] {
    return this.strains.filter(s => !s.extinct)
  }

  /** 记录感染 */
  recordInfection(strainId: number): void {
    const s = this.strains.find(s => s.id === strainId)
    if (s) s.infected++
  }

  /** 记录死亡 */
  recordDeath(strainId: number): void {
    const s = this.strains.find(s => s.id === strainId)
    if (s) s.deaths++
  }

  /** 标记灭绝 */
  markExtinct(strainId: number): void {
    const s = this.strains.find(s => s.id === strainId)
    if (s) s.extinct = true
  }

  /* ── 更新 ── */

  update(tick: number): void {
    this.tickCounter++

    // 变异检查
    if (this.tickCounter % MUTATION_CHECK_INTERVAL === 0 && this.strains.length < MAX_STRAINS) {
      for (const strain of this.strains) {
        if (strain.extinct || strain.infected < 10) continue
        if (Math.random() < strain.mutationRate) {
          this.mutate(strain, tick)
          break // 每次最多一个变异
        }
      }
    }
  }

  private mutate(parent: PlagueStrain, tick: number): void {
    const newSymptoms = [...parent.symptoms]
    // 50% 概率获得新症状
    if (Math.random() < 0.5) {
      const sym = this.randomSymptom()
      if (!newSymptoms.includes(sym)) newSymptoms.push(sym)
    }
    // 30% 概率失去一个症状
    if (Math.random() < 0.3 && newSymptoms.length > 1) {
      newSymptoms.splice(Math.floor(Math.random() * newSymptoms.length), 1)
    }

    const child: PlagueStrain = {
      id: nextStrainId++,
      name: randomName(),
      parentId: parent.id,
      infectRate: clamp(parent.infectRate + (Math.random() - 0.4) * 0.1, 0.05, 0.95),
      lethality: newSymptoms.reduce((s, sy) => s + SYMPTOM_INFO[sy].lethalityMod, 0.02),
      mutationRate: clamp(parent.mutationRate + (Math.random() - 0.5) * 0.03, 0.01, 0.3),
      symptoms: newSymptoms,
      infected: 0, deaths: 0,
      createdTick: tick, extinct: false,
    }
    this.strains.push(child)
  }

  private randomSymptom(): Symptom {
    const all: Symptom[] = ['fever', 'cough', 'rash', 'weakness', 'madness', 'blindness']
    return all[Math.floor(Math.random() * all.length)]
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'G') {
      this.visible = !this.visible
      this.scrollY = 0
      return true
    }
    return false
  }

  handleWheel(mx: number, my: number, dy: number): boolean {
    if (!this.visible) return false
    if (mx >= this.panelX && mx <= this.panelX + PANEL_W && my >= this.panelY + HEADER_H && my <= this.panelY + PANEL_H) {
      this.scrollY = clamp(this.scrollY + dy * 0.5, 0, Math.max(0, this.strains.length * ROW_H - (PANEL_H - HEADER_H)))
      return true
    }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY

    ctx.fillStyle = 'rgba(15,8,8,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    ctx.fillStyle = 'rgba(70,30,30,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#ffb0b0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    let active = 0
    for (const s of this.strains) { if (!s.extinct) active++ }
    ctx.fillText(`\u{1F9A0} 瘟疫毒株 (${active} 活跃 / ${this.strains.length} 总计)`, px + 12, py + 24)

    if (this.strains.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('世界安宁，暂无瘟疫', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    ctx.save()
    ctx.beginPath(); ctx.rect(px, py + HEADER_H, PANEL_W, PANEL_H - HEADER_H); ctx.clip()

    let drawY = py + HEADER_H + 4 - this.scrollY
    for (let i = 0; i < this.strains.length; i++) {
      const s = this.strains[i]
      if (drawY + ROW_H > py + HEADER_H && drawY < py + PANEL_H) {
        ctx.fillStyle = s.extinct ? 'rgba(30,20,20,0.3)' : i % 2 === 0 ? 'rgba(50,25,25,0.4)' : 'rgba(40,20,20,0.4)'
        ctx.fillRect(px + 4, drawY, PANEL_W - 8, ROW_H - 2)

        ctx.fillStyle = s.extinct ? '#666' : '#ffb0b0'
        ctx.font = 'bold 12px monospace'
        const prefix = s.extinct ? '\u{1F480}' : '\u{1F9A0}'
        ctx.fillText(`${prefix} ${s.name}`, px + 10, drawY + 18)

        if (s.parentId > 0) {
          ctx.fillStyle = '#888'; ctx.font = '10px monospace'
          ctx.fillText(`变异自 #${s.parentId}`, px + 200, drawY + 18)
        }

        // 症状图标
        ctx.font = '14px sans-serif'
        let symX = px + 10
        for (const sym of s.symptoms) {
          ctx.fillText(SYMPTOM_INFO[sym].icon, symX, drawY + 38)
          symX += 22
        }

        // 统计
        ctx.fillStyle = '#999'; ctx.font = '11px monospace'
        ctx.fillText(`感染:${s.infected} 死亡:${s.deaths}`, px + 10, drawY + 56)

        // 传染率条
        ctx.fillStyle = 'rgba(50,30,30,0.5)'
        ctx.fillRect(px + 200, drawY + 48, 100, 5)
        ctx.fillStyle = `hsl(${(1 - s.infectRate) * 120},70%,50%)`
        ctx.fillRect(px + 200, drawY + 48, 100 * s.infectRate, 5)
        ctx.fillStyle = '#777'; ctx.font = '9px monospace'
        ctx.fillText(`传染${(s.infectRate * 100).toFixed(0)}%`, px + 305, drawY + 55)

        // 致死率条
        ctx.fillStyle = 'rgba(50,30,30,0.5)'
        ctx.fillRect(px + 200, drawY + 36, 100, 5)
        ctx.fillStyle = `hsl(${(1 - s.lethality) * 120},70%,45%)`
        ctx.fillRect(px + 200, drawY + 36, 100 * clamp(s.lethality * 3, 0, 1), 5)
        ctx.fillText(`致死${(s.lethality * 100).toFixed(1)}%`, px + 305, drawY + 43)
      }
      drawY += ROW_H
    }

    ctx.restore()
    ctx.textAlign = 'left'
  }
}
