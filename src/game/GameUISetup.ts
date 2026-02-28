import { TILE_SIZE } from '../utils/Constants'
import { EntityManager, PositionComponent, HeroComponent, VelocityComponent, GeneticsComponent } from '../ecs/Entity'
import { EventLog } from '../systems/EventLog'
import type { WorldStats } from '../systems/AchievementSystem'
import type { World } from './World'

/** Pre-computed firework colors — avoids per-event literal array creation */
const _FIREWORK_COLORS = ['#ffd700', '#ff4488', '#44ddff', '#44ff88'] as const
import type { Camera } from './Camera'
import type { Renderer } from './Renderer'
import type { ParticleSystem } from '../systems/ParticleSystem'
import type { SoundSystem } from '../systems/SoundSystem'
import type { MusicSystem } from '../systems/MusicSystem'
import type { WeatherSystem } from '../systems/WeatherSystem'
import type { AchievementSystem } from '../systems/AchievementSystem'
import type { TimelineSystem } from '../systems/TimelineSystem'
import type { EnhancedTooltipSystem } from '../systems/EnhancedTooltipSystem'
import type { CreaturePanel } from '../ui/CreaturePanel'
import type { StatsPanel } from '../ui/StatsPanel'
import type { TechTreePanel } from '../ui/TechTreePanel'
import type { CivManager } from '../civilization/CivManager'

// Pre-computed highlight pulse colors: 101 steps for alpha 0.40..1.00
const _HIGHLIGHT_PULSE_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) cols.push(`rgba(255,255,100,${(0.4 + 0.6 * i / 100).toFixed(3)})`)
  return cols
})()

/**
 * Interface exposing the subset of Game properties needed by GameUIHelper.
 * Avoids circular dependency on the full Game class.
 */
export interface GameUIContext {
  readonly world: World
  readonly camera: Camera
  readonly renderer: Renderer
  readonly canvas: HTMLCanvasElement
  readonly minimapCanvas: HTMLCanvasElement
  readonly em: EntityManager
  readonly civManager: CivManager
  readonly achievements: AchievementSystem
  readonly timeline: TimelineSystem
  readonly particles: ParticleSystem
  readonly audio: SoundSystem
  readonly musicSystem: MusicSystem
  readonly weather: WeatherSystem
  readonly enhancedTooltip: EnhancedTooltipSystem
  readonly creaturePanel: CreaturePanel
  readonly statsPanel: StatsPanel
  readonly techTreePanel: TechTreePanel
  _minimapRectDirty: boolean
  resetWorld(): void
  showSaveLoadPanel(mode: 'save' | 'load'): void
}

/**
 * Encapsulates UI setup, panel rendering, event hooks, and visual-effect
 * helpers that were previously inlined in Game.ts.
 */
export class GameUIHelper {
  private readonly g: GameUIContext

  constructor(game: GameUIContext) {
    this.g = game
  }

  // ── Setup methods (called once during init) ──────────────────────────

  setupToolbarButtons(): void {
    const newWorldBtn = document.getElementById('newWorldBtn')
    if (newWorldBtn) {
      newWorldBtn.addEventListener('click', () => {
        this.g.resetWorld()
      })
    }

    const toggleTerritoryBtn = document.getElementById('toggleTerritoryBtn')
    if (toggleTerritoryBtn) {
      toggleTerritoryBtn.addEventListener('click', () => {
        this.g.renderer.showTerritory = !this.g.renderer.showTerritory
        toggleTerritoryBtn.classList.toggle('active', this.g.renderer.showTerritory)
      })
      toggleTerritoryBtn.classList.add('active')
    }

    const saveBtn = document.getElementById('saveBtn')
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.g.showSaveLoadPanel('save')
      })
    }

    const loadBtn = document.getElementById('loadBtn')
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.g.showSaveLoadPanel('load')
      })
    }

    const achievementsBtn = document.getElementById('achievementsBtn')
    const achievementsPanel = document.getElementById('achievementsPanel')
    if (achievementsBtn && achievementsPanel) {
      achievementsBtn.addEventListener('click', () => {
        const visible = achievementsPanel.style.display !== 'none'
        achievementsPanel.style.display = visible ? 'none' : 'block'
        if (!visible) this.renderAchievementsPanel()
      })
    }

    const timelineBtn = document.getElementById('timelineBtn')
    const timelinePanel = document.getElementById('timelinePanel')
    if (timelineBtn && timelinePanel) {
      timelineBtn.addEventListener('click', () => {
        const visible = timelinePanel.style.display !== 'none'
        timelinePanel.style.display = visible ? 'none' : 'block'
        if (!visible) this.renderTimelinePanel()
      })
    }

    const statsBtn = document.getElementById('statsBtn')
    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        this.g.statsPanel.toggle()
      })
    }

    const techTreeBtn = document.getElementById('techTreeBtn')
    if (techTreeBtn) {
      techTreeBtn.addEventListener('click', () => {
        this.g.techTreePanel.toggle()
      })
    }
  }

  setupResize(): void {
    window.addEventListener('resize', () => {
      this.g.renderer.resize(window.innerWidth, window.innerHeight)
      this.g._minimapRectDirty = true
    })
  }

  setupTooltip(): void {
    const oldTooltip = document.getElementById('tooltip')
    if (oldTooltip) oldTooltip.style.display = 'none'

    this.g.canvas.addEventListener('mousemove', (e) => {
      this.g.enhancedTooltip.update(
        e.clientX, e.clientY,
        this.g.camera, this.g.world,
        this.g.em, this.g.civManager
      )
    })

    this.g.canvas.addEventListener('mouseleave', () => {
      this.g.enhancedTooltip.hide()
    })
  }

  setupMuteButton(): void {
    const btn = document.getElementById('muteBtn')
    if (btn) {
      btn.addEventListener('click', () => {
        const muted = this.g.audio.toggleMute()
        this.g.musicSystem.setMuted(muted)
        btn.textContent = muted ? '🔇' : '🔊'
      })
    }
  }

  setupMinimapClick(): void {
    this.g.minimapCanvas.addEventListener('click', (e) => {
      const rect = this.g.minimapCanvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const scale = this.g.minimapCanvas.width / this.g.world.width
      const worldTileX = mx / scale
      const worldTileY = my / scale

      const halfViewW = (window.innerWidth / this.g.camera.zoom) / 2
      const halfViewH = (window.innerHeight / this.g.camera.zoom) / 2
      this.g.camera.x = worldTileX * TILE_SIZE - halfViewW
      this.g.camera.y = worldTileY * TILE_SIZE - halfViewH
    })
  }

  setupMinimapModeBtn(): void {
    const btn = document.getElementById('minimapModeBtn')
    if (!btn) return
    const modes: Array<'normal' | 'territory' | 'heatmap'> = ['normal', 'territory', 'heatmap']
    const labels: Record<string, string> = { normal: 'Normal', territory: 'Territory', heatmap: 'Heatmap' }
    btn.addEventListener('click', () => {
      const idx = modes.indexOf(this.g.renderer.minimapMode)
      const next = modes[(idx + 1) % modes.length]
      this.g.renderer.minimapMode = next
      btn.textContent = labels[next]
    })
  }

  setupAchievementTracking(): void {
    EventLog.onEvent((e) => {
      if (e.type === 'death') this.g.achievements.recordDeath()
      if (e.type === 'birth') this.g.achievements.recordBirth()
      if (e.type === 'war') {
        this.g.achievements.recordWar()
        this.g.timeline.recordEvent(this.g.world.tick, 'war', e.message)
      }
      if (e.type === 'combat') this.g.achievements.recordKill()
      if (e.type === 'disaster') this.g.timeline.recordEvent(this.g.world.tick, 'disaster', e.message)
      if (e.type === 'building' && e.message.includes('founded')) this.g.timeline.recordEvent(this.g.world.tick, 'founding', e.message)
    })
  }

  /** Hook into EventLog to trigger celebration fireworks on treaty signing */
  setupParticleEventHooks(): void {
    EventLog.onEvent((e) => {
      if (e.type === 'peace' && e.message.includes('signed')) {
        for (const [, civ] of this.g.civManager.civilizations) {
          if (e.message.includes(civ.name) && civ.territory.size > 0) {
            const terrSize = civ.territory.size
            let targetIdx = Math.floor(Math.random() * terrSize)
            for (const key of civ.territory) {
              if (targetIdx-- === 0) {
                const comma = key.indexOf(',')
                const tx = +key.substring(0, comma), ty = +key.substring(comma + 1)
                const color = _FIREWORK_COLORS[Math.floor(Math.random() * _FIREWORK_COLORS.length)]
                this.g.particles.spawnFirework(tx, ty, color)
                break
              }
            }
            break
          }
        }
      }
    })
  }

  /** Play contextual sound effects based on game events */
  setupSoundEventHooks(): void {
    let lastAchievementCount = 0
    EventLog.onEvent((e) => {
      if (e.type === 'building') this.g.audio.playBuild()
      if (e.type === 'peace' || e.type === 'diplomacy') this.g.audio.playDiplomacy()
      if (e.type === 'trade') this.g.audio.playTrade()
      const current = this.g.achievements.getProgress().unlocked
      if (current > lastAchievementCount) {
        this.g.audio.playAchievement()
        lastAchievementCount = current
      }
    })
  }

  // ── Render / tick helpers (called every frame or periodically) ────────

  renderSelectedHighlight(): void {
    const id = this.g.creaturePanel.getSelected()
    if (!id) return
    const pos = this.g.em.getComponent<PositionComponent>(id, 'position')
    if (!pos) return

    const ctx = this.g.canvas.getContext('2d')!
    const tileSize = 8 * this.g.camera.zoom
    const offsetX = -this.g.camera.x * this.g.camera.zoom
    const offsetY = -this.g.camera.y * this.g.camera.zoom
    const screenX = pos.x * tileSize + offsetX + tileSize / 2
    const screenY = pos.y * tileSize + offsetY + tileSize / 2
    const radius = 6 * this.g.camera.zoom

    const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7
    const pulseIdx = Math.min(100, Math.round((pulse - 0.4) / 0.6 * 100))
    ctx.strokeStyle = _HIGHLIGHT_PULSE_COLORS[pulseIdx]
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  renderAchievementsPanel(): void {
    const panel = document.getElementById('achievementsPanel')
    if (!panel) return
    const all = this.g.achievements.getAll()
    const progress = this.g.achievements.getProgress()
    let html = `<div class="title">\u{1F3C6} Achievements (${progress.unlocked}/${progress.total})</div>`
    html += '<div style="display:flex;flex-direction:column;gap:4px">'
    for (const a of all) {
      const opacity = a.unlocked ? '1' : '0.35'
      const bg = a.unlocked ? 'rgba(100,140,200,0.15)' : 'rgba(40,40,60,0.3)'
      const check = a.unlocked ? '\u2705' : '\u{1F512}'
      html += `<div style="opacity:${opacity};background:${bg};padding:6px 10px;border-radius:6px;display:flex;align-items:center;gap:8px">`
      html += `<span style="font-size:18px">${a.icon}</span>`
      html += `<div><div style="font-weight:bold;font-size:12px">${a.name} ${check}</div>`
      html += `<div style="font-size:10px;color:#888">${a.description}</div></div></div>`
    }
    html += '</div>'
    panel.innerHTML = html
  }

  updateAchievementsButton(): void {
    const btn = document.getElementById('achievementsBtn')
    if (btn) {
      const p = this.g.achievements.getProgress()
      btn.textContent = `\u{1F3C6} ${p.unlocked}/${p.total}`
    }
  }

  renderTimelinePanel(): void {
    const panel = document.getElementById('timelinePanel')
    if (!panel) return

    const era = this.g.timeline.getCurrentEra()
    const progress = this.g.timeline.getEraProgress(this.g.world.tick)
    const age = this.g.timeline.getWorldAge(this.g.world.tick)
    const eras = this.g.timeline.getEraDefinitions()
    const history = this.g.timeline.getHistory()

    let html = `<div style="font-weight:bold;margin-bottom:8px;font-size:13px;border-bottom:1px solid #555;padding-bottom:4px">`
    html += `\u{1F30D} World Timeline - ${age}</div>`

    html += `<div style="margin-bottom:8px">`
    html += `<div style="font-size:11px;color:${era.color};margin-bottom:3px">Current Era: ${era.name}</div>`
    html += `<div style="background:#222;border-radius:4px;height:8px;overflow:hidden">`
    html += `<div style="background:${era.color};height:100%;width:${Math.round(progress * 100)}%;transition:width 0.3s"></div></div>`

    html += `<div style="display:flex;gap:2px;margin-top:4px">`
    for (let i = 0; i < eras.length; i++) {
      const e = eras[i]
      const active = i <= era.index
      html += `<div style="flex:1;height:4px;border-radius:2px;background:${active ? e.color : '#333'}" title="${e.name}"></div>`
    }
    html += `</div></div>`

    html += `<div style="color:#aaa;font-size:10px;margin-bottom:3px">HISTORICAL EVENTS</div>`
    html += `<div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:3px">`
    const recent = history.slice(-20).reverse()
    const typeIcons: Record<string, string> = {
      era_change: '\u{1F451}', war: '\u2694\uFE0F', disaster: '\u{1F30B}',
      achievement: '\u{1F3C6}', founding: '\u{1F3F0}', collapse: '\u{1F4A5}'
    }
    for (const ev of recent) {
      const icon = typeIcons[ev.type] || '\u{1F4DC}'
      const yr = this.g.timeline.getWorldAge(ev.tick)
      html += `<div style="font-size:10px;padding:2px 4px;background:rgba(40,40,60,0.4);border-radius:3px">`
      html += `<span style="color:#666">${yr}</span> ${icon} ${ev.description}</div>`
    }
    html += `</div>`

    panel.innerHTML = html
  }

  /** Spawn hero trails and mutation auras each tick */
  updateVisualEffects(): void {
    if (this.g.world.tick % 3 === 0) {
      const heroes = this.g.em.getEntitiesWithComponents('position', 'hero', 'velocity')
      for (const id of heroes) {
        const pos = this.g.em.getComponent<PositionComponent>(id, 'position')
        const vel = this.g.em.getComponent<VelocityComponent>(id, 'velocity')
        if (!pos || !vel) continue
        if (Math.abs(vel.vx) > 0.01 || Math.abs(vel.vy) > 0.01) {
          const hero = this.g.em.getComponent<HeroComponent>(id, 'hero')
          if (!hero) continue
          const trailColors: Record<string, string> = {
            warrior: '#ffd700', ranger: '#44ff44', healer: '#aaaaff', berserker: '#ff4444'
          }
          this.g.particles.spawnTrail(pos.x, pos.y, trailColors[hero.ability] || '#ffd700')
        }
      }
    }

    if (this.g.world.tick % 10 === 0) {
      const mutants = this.g.em.getEntitiesWithComponents('position', 'genetics')
      for (const id of mutants) {
        const gen = this.g.em.getComponent<GeneticsComponent>(id, 'genetics')
        if (!gen) continue
        if (gen.mutations.length > 0) {
          const pos = this.g.em.getComponent<PositionComponent>(id, 'position')
          if (pos) this.g.particles.spawnAura(pos.x, pos.y, '#d4f', 0.6)
        }
      }
    }
  }

  gatherWorldStats(): WorldStats {
    const creatures = this.g.em.getEntitiesWithComponents('position', 'creature')
    const heroes = this.g.em.getEntitiesWithComponents('hero')
    const buildings = this.g.em.getEntitiesWithComponents('building')
    let maxPop = 0
    let maxTech = 0
    let tradeRoutes = 0
    for (const [, civ] of this.g.civManager.civilizations) {
      if (civ.population > maxPop) maxPop = civ.population
      if (civ.techLevel > maxTech) maxTech = civ.techLevel
      tradeRoutes += civ.tradeRoutes.length
    }
    return {
      totalPopulation: creatures.length,
      totalCivs: this.g.civManager.civilizations.size,
      totalBuildings: buildings.length,
      totalDeaths: 0,
      totalBirths: 0,
      totalWars: 0,
      maxTechLevel: maxTech,
      maxCivPopulation: maxPop,
      worldTick: this.g.world.tick,
      totalKills: 0,
      heroCount: heroes.length,
      tradeRouteCount: tradeRoutes
    }
  }

  updateDayNightIndicator(): void {
    if (this.g.world.tick % 30 !== 0) return
    const el = document.getElementById('dayNightIndicator')
    if (!el) return
    const isDay = this.g.world.isDay()
    const icon = isDay ? '☀️' : '🌙'
    const timeStr = isDay ? 'Day' : 'Night'
    const hour = Math.floor(this.g.world.dayNightCycle * 24)
    const weatherLabel = this.g.weather.getWeatherLabel()
    const seasonLabels = { spring: '🌱 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' }
    const seasonLabel = seasonLabels[this.g.world.season]
    el.textContent = `${icon} ${timeStr} (${hour}:00) | ${seasonLabel} | ${weatherLabel}`
  }
}
