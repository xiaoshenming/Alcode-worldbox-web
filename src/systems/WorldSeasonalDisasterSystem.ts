// World Seasonal Disaster System (v2.22) - Season-specific natural disasters
// Different seasons trigger different types of disasters with varying severity

import { EntityManager, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter'
export type SeasonDisasterType = 'flood' | 'heatwave' | 'wildfire' | 'blizzard' | 'tornado' | 'monsoon' | 'drought' | 'ice_storm'

export interface SeasonalDisaster {
  id: number
  type: SeasonDisasterType
  season: SeasonType
  x: number
  y: number
  radius: number
  severity: number        // 1-5
  duration: number        // ticks remaining
  maxDuration: number
  damagePerTick: number
  startTick: number
  label: string           // Pre-computed "${type} (${severity})" for render
  panelLabel: string      // Pre-computed "${type} sev${severity}" for panel render
  /** Pre-computed percentage string — updated when pct changes by 1 */
  pctStr: string
  /** Pre-computed "panelLabel pct%" display string — updated when pctStr changes */
  panelLine: string
  _lastPct: number
}

const CHECK_INTERVAL = 1500
const DAMAGE_INTERVAL = 300
const MAX_ACTIVE = 3
const BASE_DURATION = 2000
const BASE_RADIUS = 12

const SEASON_DISASTERS: Record<SeasonType, SeasonDisasterType[]> = {
  spring: ['flood', 'tornado'],
  summer: ['heatwave', 'wildfire'],
  autumn: ['monsoon', 'drought'],
  winter: ['blizzard', 'ice_storm'],
}

const DISASTER_COLORS: Record<SeasonDisasterType, string> = {
  flood: '#48f',
  heatwave: '#f84',
  wildfire: '#f40',
  blizzard: '#cef',
  tornado: '#888',
  monsoon: '#36a',
  drought: '#a86',
  ice_storm: '#adf',
}

const DISASTER_DAMAGE: Record<SeasonDisasterType, number> = {
  flood: 3,
  heatwave: 2,
  wildfire: 5,
  blizzard: 4,
  tornado: 6,
  monsoon: 3,
  drought: 1,
  ice_storm: 4,
}

let nextDisasterId = 1

interface WorldLike {
  tick: number
  width: number
  height: number
  getTile(x: number, y: number): number | null
}

export class WorldSeasonalDisasterSystem {
  private disasters: SeasonalDisaster[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextDamageTick = DAMAGE_INTERVAL
  private currentSeason: SeasonType = 'spring'
  private _lastZoom = -1
  private _nameFont = ''
  private _prevDisasterCount = -1
  private _headerStr = 'Seasonal Disasters (0)'

  getActiveCount(): number { return this.disasters.length }

  setSeason(season: SeasonType): void { this.currentSeason = season }

  update(dt: number, em: EntityManager, world: WorldLike): void {
    const tick = world.tick

    // Decay active disasters
    for (let i = this.disasters.length - 1; i >= 0; i--) {
      const d = this.disasters[i]
      d.duration--
      if (d.duration <= 0) {
        EventLog.log('disaster', `${d.type} has subsided`, 0)
        this.disasters.splice(i, 1)
      } else {
        const pct = Math.round(100 * d.duration / d.maxDuration)
        if (pct !== d._lastPct) { d._lastPct = pct; d.pctStr = String(pct); d.panelLine = `${d.panelLabel} ${d.pctStr}%` }
      }
    }

    // Spawn new seasonal disasters
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      if (this.disasters.length < MAX_ACTIVE && Math.random() < 0.3) {
        this.spawnDisaster(world, tick)
      }
    }

    // Apply damage
    if (tick >= this.nextDamageTick) {
      this.nextDamageTick = tick + DAMAGE_INTERVAL
      this.applyDamage(em)
    }
  }

  private spawnDisaster(world: WorldLike, tick: number): void {
    const types = SEASON_DISASTERS[this.currentSeason]
    const type = types[Math.floor(Math.random() * types.length)]
    const severity = 1 + Math.floor(Math.random() * 5)
    const x = Math.floor(Math.random() * world.width)
    const y = Math.floor(Math.random() * world.height)

    const disaster: SeasonalDisaster = {
      id: nextDisasterId++,
      type,
      season: this.currentSeason,
      x, y,
      radius: BASE_RADIUS + severity * 3,
      severity,
      duration: BASE_DURATION + severity * 500,
      maxDuration: BASE_DURATION + severity * 500,
      damagePerTick: DISASTER_DAMAGE[type] * severity,
      startTick: tick,
      label: `${type} (${severity})`,
      panelLabel: `${type} sev${severity}`,
      pctStr: '100',
      panelLine: `${type} sev${severity} 100%`,
      _lastPct: 100,
    }
    this.disasters.push(disaster)
    EventLog.log('disaster', `A ${type} (severity ${severity}) strikes during ${this.currentSeason}!`, 0)
  }

  private applyDamage(em: EntityManager): void {
    const entities = em.getEntitiesWithComponents('position', 'needs')
    for (const disaster of this.disasters) {
      for (const eid of entities) {
        const pos = em.getComponent<PositionComponent>(eid, 'position')
        if (!pos) continue
        const dx = pos.x - disaster.x
        const dy = pos.y - disaster.y
        if (dx * dx + dy * dy < disaster.radius * disaster.radius) {
          const needs = em.getComponent<NeedsComponent>(eid, 'needs')
          if (needs) {
            needs.health = Math.max(0, needs.health - disaster.damagePerTick)
          }
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._nameFont = `${Math.max(8, 10 * zoom)}px monospace`
    }
    for (const d of this.disasters) {
      const sx = (d.x - camX) * zoom
      const sy = (d.y - camY) * zoom
      const sr = d.radius * zoom
      if (sx + sr < 0 || sy + sr < 0 || sx - sr > ctx.canvas.width || sy - sr > ctx.canvas.height) continue

      const color = DISASTER_COLORS[d.type]
      const progress = d.duration / d.maxDuration

      // Disaster zone
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.15 + 0.15 * progress
      ctx.fill()
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = this._nameFont
      ctx.textAlign = 'center'
      ctx.fillText(d.label, sx, sy - sr - 4)
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.disasters.length === 0) return

    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 220, 20 + this.disasters.length * 18)
    ctx.fillStyle = '#f84'
    ctx.font = '12px monospace'
    const dl = this.disasters.length
    if (dl !== this._prevDisasterCount) { this._prevDisasterCount = dl; this._headerStr = `Seasonal Disasters (${dl})` }
    ctx.fillText(this._headerStr, x + 8, y + 14)

    for (let i = 0; i < this.disasters.length; i++) {
      const d = this.disasters[i]
      ctx.fillStyle = DISASTER_COLORS[d.type]
      ctx.fillText(d.panelLine, x + 8, y + 32 + i * 18)
    }
  }
}
