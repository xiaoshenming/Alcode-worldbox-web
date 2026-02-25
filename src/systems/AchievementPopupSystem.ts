/**
 * AchievementPopupSystem - 成就弹窗增强系统
 * 提供成就解锁动画、进度追踪、总览面板和粒子庆祝效果
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'explore' | 'war' | 'build' | 'disaster' | 'special'

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  maxProgress: number
}

interface AchievementState {
  def: AchievementDef
  progress: number
  unlocked: boolean
  unlockTick: number
  displayProgress: number
}

interface PopupCard {
  achievementId: string
  startTick: number
  slideIn: number
  phase: 'enter' | 'stay' | 'exit'
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number
  r: number; g: number; b: number
}

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#9e9e9e', rare: '#2196f3', epic: '#9c27b0', legendary: '#ffd700'
}
const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: 'rgba(158,158,158,0.4)', rare: 'rgba(33,150,243,0.5)',
  epic: 'rgba(156,39,176,0.5)', legendary: 'rgba(255,215,0,0.6)'
}
const RARITY_PARTICLES: Record<AchievementRarity, number> = {
  common: 12, rare: 24, epic: 40, legendary: 80
}
const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  explore: '探索', war: '战争', build: '建设', disaster: '灾难', special: '特殊'
}
const CARD_W = 280, CARD_H = 72, CARD_PAD = 8
const ENTER_TICKS = 20, STAY_TICKS = 180, EXIT_TICKS = 20
const PROGRESS_BAR_H = 6, TRACKER_W = 200, TRACKER_ITEM_H = 32

function easeOutCubic(t: number): number {
  const t1 = t - 1
  return t1 * t1 * t1 + 1
}

/** 成就弹窗增强系统 - 解锁动画、进度追踪、总览面板、粒子庆祝 */
export class AchievementPopupSystem {
  private achievements: Map<string, AchievementState> = new Map()
  private popupQueue: string[] = []
  private activePopup: PopupCard | null = null
  private particles: Particle[] = []
  private panelVisible = false
  private panelScroll = 0
  private selectedCategory: AchievementCategory = 'explore'
  private panelRect = { x: 0, y: 0, w: 0, h: 0 }

  /** 注册一个成就定义 */
  registerAchievement(def: AchievementDef): void {
    if (this.achievements.has(def.id)) return
    this.achievements.set(def.id, {
      def, progress: 0, unlocked: false, unlockTick: 0, displayProgress: 0
    })
  }

  /** 解锁指定成就并触发弹窗 */
  unlock(achievementId: string, tick: number): void {
    const state = this.achievements.get(achievementId)
    if (!state || state.unlocked) return
    state.unlocked = true
    state.unlockTick = tick
    state.progress = state.def.maxProgress
    state.displayProgress = state.def.maxProgress
    this.popupQueue.push(achievementId)
  }

  /** 更新成就进度 */
  updateProgress(achievementId: string, progress: number): void {
    const state = this.achievements.get(achievementId)
    if (!state || state.unlocked) return
    state.progress = Math.min(progress, state.def.maxProgress)
  }

  /** 获取成就当前进度 */
  getProgress(achievementId: string): number {
    return this.achievements.get(achievementId)?.progress ?? 0
  }

  /** 成就是否已解锁 */
  isUnlocked(achievementId: string): boolean {
    return this.achievements.get(achievementId)?.unlocked ?? false
  }

  /** 切换总览面板显示 */
  toggle(): void { this.panelVisible = !this.panelVisible; this.panelScroll = 0 }

  /** 总览面板是否可见 */
  isVisible(): boolean { return this.panelVisible }

  /** 已解锁数量 */
  getUnlockedCount(): number {
    let c = 0; this.achievements.forEach(s => { if (s.unlocked) c++ }); return c
  }

  /** 成就总数 */
  getTotalCount(): number { return this.achievements.size }

  /** 每 tick 更新动画状态 */
  update(tick: number): void {
    // 弹窗状态机
    if (this.activePopup) {
      const p = this.activePopup
      const elapsed = tick - p.startTick
      if (p.phase === 'enter') {
        p.slideIn = Math.min(1, elapsed / ENTER_TICKS)
        if (elapsed >= ENTER_TICKS) p.phase = 'stay'
      } else if (p.phase === 'stay') {
        if (elapsed >= ENTER_TICKS + STAY_TICKS) p.phase = 'exit'
      } else {
        const exitElapsed = elapsed - ENTER_TICKS - STAY_TICKS
        p.slideIn = Math.max(0, 1 - exitElapsed / EXIT_TICKS)
        if (exitElapsed >= EXIT_TICKS) this.activePopup = null
      }
    }
    if (!this.activePopup && this.popupQueue.length > 0) {
      const id = this.popupQueue.shift()!
      this.activePopup = { achievementId: id, startTick: tick, slideIn: 0, phase: 'enter' }
      this.spawnParticles(id)
    }
    // 进度条平滑动画
    this.achievements.forEach(s => {
      if (s.displayProgress < s.progress) {
        s.displayProgress += (s.progress - s.displayProgress) * 0.15 + 0.1
        if (s.displayProgress > s.progress) s.displayProgress = s.progress
      }
    })
    // 粒子更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i]
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08; pt.life--
      if (pt.life <= 0) { this.particles[i] = this.particles[this.particles.length - 1]; this.particles.pop() }
    }
  }

  /** 渲染所有成就 UI */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    this.renderPopup(ctx, screenWidth)
    this.renderTracker(ctx, screenWidth, screenHeight)
    this.renderParticles(ctx)
    if (this.panelVisible) this.renderPanel(ctx, screenWidth, screenHeight)
  }

  /** 处理点击事件，返回是否消费 */
  handleClick(x: number, y: number): boolean {
    if (!this.panelVisible) return false
    const r = this.panelRect
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) {
      this.panelVisible = false; return true
    }
    // 分类标签点击
    const tabY = r.y + 40
    if (y >= tabY && y <= tabY + 24) {
      const cats: AchievementCategory[] = ['explore', 'war', 'build', 'disaster', 'special']
      const tabW = (r.w - 20) / cats.length
      const idx = Math.floor((x - r.x - 10) / tabW)
      if (idx >= 0 && idx < cats.length) { this.selectedCategory = cats[idx]; this.panelScroll = 0 }
    }
    return true
  }

  private spawnParticles(achievementId: string): void {
    const state = this.achievements.get(achievementId)
    if (!state) return
    const count = RARITY_PARTICLES[state.def.rarity]
    const isLegendary = state.def.rarity === 'legendary'
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 3
      const colors = isLegendary
        ? [{ r: 255, g: 215, b: 0 }, { r: 255, g: 100, b: 50 }, { r: 255, g: 255, b: 200 }]
        : [{ r: 255, g: 215, b: 0 }]
      const c = colors[Math.floor(Math.random() * colors.length)]
      this.particles.push({
        x: isLegendary ? Math.random() * 800 : 0,
        y: isLegendary ? Math.random() * 600 : 0,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 40, maxLife: 80,
        size: 2 + Math.random() * 3, r: c.r, g: c.g, b: c.b
      })
    }
  }

  private renderPopup(ctx: CanvasRenderingContext2D, screenWidth: number): void {
    if (!this.activePopup) return
    const p = this.activePopup
    const state = this.achievements.get(p.achievementId)
    if (!state) return
    const eased = easeOutCubic(p.slideIn)
    const xOff = (1 - eased) * (CARD_W + 20)
    const x = screenWidth - CARD_W - 12 + xOff
    const y = 60
    const color = RARITY_COLORS[state.def.rarity]
    const glow = RARITY_GLOW[state.def.rarity]
    // 更新粒子原点
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i]
      if (pt.x === 0 && pt.y === 0) { pt.x = x + CARD_W / 2; pt.y = y + CARD_H / 2 }
    }
    ctx.save()
    ctx.shadowBlur = 16; ctx.shadowColor = glow
    // 背景
    ctx.fillStyle = 'rgba(20,20,30,0.92)'
    ctx.beginPath(); ctx.roundRect(x, y, CARD_W, CARD_H, 8); ctx.fill()
    // 边框
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(x, y, CARD_W, CARD_H, 8); ctx.stroke()
    ctx.shadowBlur = 0
    // 图标
    ctx.font = '28px serif'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(state.def.icon, x + 12, y + CARD_H / 2)
    // 标题
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = color; ctx.textBaseline = 'top'
    ctx.fillText(state.def.name, x + 50, y + 10)
    // 描述
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#ccc'
    ctx.fillText(state.def.description, x + 50, y + 30)
    // 稀有度标签
    ctx.font = '10px sans-serif'; ctx.fillStyle = color
    const rarityLabel = state.def.rarity.toUpperCase()
    ctx.fillText(rarityLabel, x + 50, y + CARD_H - 18)
    ctx.restore()
  }

  private renderTracker(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    // 找最接近完成的 3 个未解锁成就
    const candidates: AchievementState[] = []
    this.achievements.forEach(s => {
      if (!s.unlocked && s.progress > 0) candidates.push(s)
    })
    candidates.sort((a, b) => (b.progress / b.def.maxProgress) - (a.progress / a.def.maxProgress))
    const top3 = candidates.slice(0, 3)
    if (top3.length === 0) return
    const baseX = sw - TRACKER_W - 12
    let baseY = sh - 12 - top3.length * (TRACKER_ITEM_H + 4)
    ctx.save()
    ctx.font = '10px sans-serif'; ctx.textBaseline = 'middle'
    for (let i = 0; i < top3.length; i++) {
      const s = top3[i]
      const y = baseY + i * (TRACKER_ITEM_H + 4)
      const pct = s.displayProgress / s.def.maxProgress
      const color = RARITY_COLORS[s.def.rarity]
      // 背景
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath(); ctx.roundRect(baseX, y, TRACKER_W, TRACKER_ITEM_H, 4); ctx.fill()
      // 名称
      ctx.fillStyle = '#ddd'
      ctx.fillText(s.def.name, baseX + 6, y + 10)
      // 百分比
      ctx.fillStyle = color; ctx.textAlign = 'right'
      ctx.fillText(`${Math.floor(pct * 100)}%`, baseX + TRACKER_W - 6, y + 10)
      ctx.textAlign = 'left'
      // 进度条背景
      const barX = baseX + 6, barY = y + 20, barW = TRACKER_W - 12
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, PROGRESS_BAR_H, 3); ctx.fill()
      // 进度条填充
      ctx.fillStyle = color
      ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, PROGRESS_BAR_H, 3); ctx.fill()
    }
    ctx.restore()
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0) return
    ctx.save()
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i]
      const alpha = pt.life / pt.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = `rgb(${pt.r},${pt.g},${pt.b})`
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  private renderPanel(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    const pw = Math.min(520, sw - 40), ph = Math.min(420, sh - 40)
    const px = (sw - pw) / 2, py = (sh - ph) / 2
    this.panelRect = { x: px, y: py, w: pw, h: ph }
    ctx.save()
    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, sw, sh)
    // 面板背景
    ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(255,215,0,0.3)'
    ctx.fillStyle = 'rgba(15,15,25,0.95)'
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill()
    ctx.shadowBlur = 0
    // 标题
    ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#ffd700'; ctx.textBaseline = 'top'
    const unlocked = this.getUnlockedCount(), total = this.getTotalCount()
    ctx.fillText(`成就总览  ${unlocked}/${total}`, px + 14, py + 12)
    // 分类标签
    const cats: AchievementCategory[] = ['explore', 'war', 'build', 'disaster', 'special']
    const tabW = (pw - 20) / cats.length
    const tabY = py + 40
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i]
      const tx = px + 10 + i * tabW
      const active = cat === this.selectedCategory
      ctx.fillStyle = active ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'
      ctx.beginPath(); ctx.roundRect(tx, tabY, tabW - 4, 22, 4); ctx.fill()
      ctx.font = '11px sans-serif'
      ctx.fillStyle = active ? '#ffd700' : '#888'; ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(CATEGORY_LABELS[cat], tx + (tabW - 4) / 2, tabY + 11)
    }
    ctx.textAlign = 'left'
    // 成就列表
    const listY = tabY + 30, listH = ph - 80
    ctx.save()
    ctx.beginPath(); ctx.rect(px, listY, pw, listH); ctx.clip()
    const filtered: AchievementState[] = []
    this.achievements.forEach(s => { if (s.def.category === this.selectedCategory) filtered.push(s) })
    filtered.sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1))
    const itemH = 52
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i]
      const iy = listY + i * itemH - this.panelScroll
      if (iy + itemH < listY || iy > listY + listH) continue
      const color = RARITY_COLORS[s.def.rarity]
      // 行背景
      ctx.fillStyle = s.unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)'
      ctx.beginPath(); ctx.roundRect(px + 8, iy, pw - 16, itemH - 4, 4); ctx.fill()
      // 图标
      ctx.globalAlpha = s.unlocked ? 1 : 0.3
      ctx.font = '22px serif'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(s.def.icon, px + 18, iy + itemH / 2)
      // 名称
      ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = s.unlocked ? color : '#555'
      ctx.textBaseline = 'top'
      ctx.fillText(s.def.name, px + 48, iy + 6)
      // 描述
      ctx.font = '10px sans-serif'; ctx.fillStyle = s.unlocked ? '#aaa' : '#444'
      ctx.fillText(s.def.description, px + 48, iy + 22)
      // 解锁时间或进度
      ctx.font = '9px sans-serif'
      if (s.unlocked) {
        ctx.fillStyle = '#666'
        ctx.fillText(`Tick ${s.unlockTick} 解锁`, px + 48, iy + 36)
      } else if (s.progress > 0) {
        const pct = Math.floor((s.progress / s.def.maxProgress) * 100)
        ctx.fillStyle = '#555'
        ctx.fillText(`进度: ${pct}%`, px + 48, iy + 36)
      }
      ctx.globalAlpha = 1
      // 稀有度指示条
      ctx.fillStyle = s.unlocked ? color : 'rgba(255,255,255,0.08)'
      ctx.fillRect(px + pw - 20, iy + 4, 4, itemH - 12)
    }
    ctx.restore()
    ctx.restore()
  }
}
