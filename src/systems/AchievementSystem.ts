// Achievement system - tracks milestones and shows notification popups

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  condition: (stats: WorldStats) => boolean
  unlocked: boolean
  unlockedAt: number // tick when unlocked
}

export interface WorldStats {
  totalPopulation: number
  totalCivs: number
  totalBuildings: number
  totalDeaths: number
  totalBirths: number
  totalWars: number
  maxTechLevel: number
  maxCivPopulation: number
  worldTick: number
  totalKills: number
  heroCount: number
  tradeRouteCount: number
}

export class AchievementSystem {
  private achievements: Achievement[] = []
  private _unlockedBuf: Achievement[] = []
  private _progressBuf = { unlocked: 0, total: 0 }
  private notifications: { text: string; icon: string; alpha: number; y: number; textWidth: number }[] = []
  private stats: WorldStats = {
    totalPopulation: 0, totalCivs: 0, totalBuildings: 0,
    totalDeaths: 0, totalBirths: 0, totalWars: 0,
    maxTechLevel: 0, maxCivPopulation: 0, worldTick: 0,
    totalKills: 0, heroCount: 0, tradeRouteCount: 0
  }

  constructor() {
    this.initAchievements()
  }

  private initAchievements(): void {
    const defs: [string, string, string, string, (s: WorldStats) => boolean][] = [
      ['first_life', 'First Life', 'A creature exists in the world', '🌱', s => s.totalPopulation >= 1],
      ['small_village', 'Small Village', 'Reach 10 population', '🏘️', s => s.totalPopulation >= 10],
      ['growing_town', 'Growing Town', 'Reach 50 population', '🏙️', s => s.totalPopulation >= 50],
      ['metropolis', 'Metropolis', 'Reach 200 population', '🌆', s => s.totalPopulation >= 200],
      ['first_civ', 'Dawn of Civilization', 'A civilization is founded', '🏛️', s => s.totalCivs >= 1],
      ['multi_civ', 'Diverse World', 'Have 3 civilizations at once', '🌐', s => s.totalCivs >= 3],
      ['many_civs', 'Age of Nations', 'Have 5 civilizations at once', '🗺️', s => s.totalCivs >= 5],
      ['first_war', 'First Blood', 'A war breaks out', '⚔️', s => s.totalWars >= 1],
      ['warmonger', 'Warmonger', '5 wars have occurred', '🔥', s => s.totalWars >= 5],
      ['builder', 'Master Builder', '20 buildings constructed', '🏗️', s => s.totalBuildings >= 20],
      ['architect', 'Grand Architect', '50 buildings constructed', '🏰', s => s.totalBuildings >= 50],
      ['tech_bronze', 'Bronze Age', 'A civilization reaches tech level 2', '🔧', s => s.maxTechLevel >= 2],
      ['tech_iron', 'Iron Age', 'A civilization reaches tech level 3', '⚒️', s => s.maxTechLevel >= 3],
      ['tech_steel', 'Industrial Age', 'A civilization reaches tech level 4', '⚙️', s => s.maxTechLevel >= 4],
      ['tech_max', 'Enlightenment', 'A civilization reaches max tech level', '💡', s => s.maxTechLevel >= 5],
      ['hero_born', 'A Hero Rises', 'A hero appears in the world', '⭐', s => s.heroCount >= 1],
      ['many_heroes', 'Age of Heroes', '5 heroes exist at once', '🌟', s => s.heroCount >= 5],
      ['first_trade', 'Silk Road', 'A trade route is established', '🚢', s => s.tradeRouteCount >= 1],
      ['trade_network', 'Trade Empire', '5 trade routes active', '💰', s => s.tradeRouteCount >= 5],
      ['mass_death', 'The Great Dying', '100 deaths have occurred', '💀', s => s.totalDeaths >= 100],
      ['baby_boom', 'Baby Boom', '50 births have occurred', '👶', s => s.totalBirths >= 50],
      ['ancient_world', 'Ancient World', 'World survives 50000 ticks', '⏳', s => s.worldTick >= 50000],
      ['eternal_world', 'Eternal World', 'World survives 200000 ticks', '♾️', s => s.worldTick >= 200000],
      ['superpower', 'Superpower', 'A civilization has 30+ members', '👑', s => s.maxCivPopulation >= 30],
    ]

    this.achievements = defs.map(([id, name, description, icon, condition]) => ({
      id, name, description, icon, condition, unlocked: false, unlockedAt: 0
    }))
    this._progressBuf.total = this.achievements.length
  }

  updateStats(stats: WorldStats): void {
    this.stats = stats
    this.checkAchievements()
  }

  private checkAchievements(): void {
    for (const a of this.achievements) {
      if (a.unlocked) continue
      if (a.condition(this.stats)) {
        a.unlocked = true
        a.unlockedAt = this.stats.worldTick
        this._progressBuf.unlocked++
        this.showNotification(a)
      }
    }
  }

  private showNotification(a: Achievement): void {
    this.notifications.push({
      text: `${a.icon} ${a.name}`,
      icon: a.icon,
      alpha: 3.0, // stays visible for ~3 seconds then fades
      y: 0,
      textWidth: 0,
    })
  }

  updateNotifications(): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i]
      n.alpha -= 0.016 // ~1/60 per frame
      if (n.alpha <= 0) {
        this.notifications.splice(i, 1)
      }
    }
  }

  renderNotifications(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (this.notifications.length === 0) return

    const baseX = canvasWidth / 2
    let baseY = 60

    // Single save/restore for entire loop — globalAlpha set explicitly per notification
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const n of this.notifications) {
      const alpha = Math.min(1, n.alpha)
      const slideY = n.alpha > 2.5 ? (3.0 - n.alpha) * 2 * 40 : 0 // slide in from top

      ctx.globalAlpha = alpha

      // Background pill
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif'
      if (n.textWidth === 0) n.textWidth = ctx.measureText(n.text).width
      const textWidth = n.textWidth
      const pillW = textWidth + 40
      const pillH = 36
      const px = baseX - pillW / 2
      const py = baseY - pillH / 2 + slideY

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.roundRect(px + 2, py + 2, pillW, pillH, 18)
      ctx.fill()

      // Gradient background — use fixed solid color to avoid per-notification createLinearGradient
      ctx.fillStyle = '#3a2a6a'
      ctx.beginPath()
      ctx.roundRect(px, py, pillW, pillH, 18)
      ctx.fill()

      // Border glow
      ctx.strokeStyle = '#8a6aea'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(px, py, pillW, pillH, 18)
      ctx.stroke()

      // Text
      ctx.fillStyle = '#fff'
      ctx.fillText(n.text, baseX, py + pillH / 2)

      // "Achievement Unlocked" subtitle
      ctx.font = '10px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = '#aaa'
      ctx.fillText('Achievement Unlocked!', baseX, py + pillH + 10)

      baseY += pillH + 24
    }
    ctx.restore()
  }

  getUnlocked(): Achievement[] {
    this._unlockedBuf.length = 0
    for (const a of this.achievements) { if (a.unlocked) this._unlockedBuf.push(a) }
    return this._unlockedBuf
  }

  getAll(): Achievement[] {
    return this.achievements
  }

  getProgress(): { unlocked: number; total: number } {
    return this._progressBuf
  }

  // Increment counters for events that happen once (deaths, births, wars)
  recordDeath(): void { this.stats.totalDeaths++ }
  recordBirth(): void { this.stats.totalBirths++ }
  recordWar(): void { this.stats.totalWars++ }
  recordKill(): void { this.stats.totalKills++ }
}
