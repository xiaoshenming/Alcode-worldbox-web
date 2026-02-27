// Season Festival System (v2.12) - Civilizations hold festivals during specific seasons
// Festivals boost morale, population growth, and inter-civ relations

import { EventLog } from './EventLog'

export type FestivalType = 'harvest' | 'solstice' | 'spring_bloom' | 'winter_feast'

export interface Festival {
  id: number
  civId: number
  type: FestivalType
  startTick: number
  duration: number
  active: boolean
  moraleBoost: number
}

type CivLike = { id: number; name: string; population: number; relations: Map<number, number> }
type CivManagerLike = { civilizations: Map<number, CivLike> }
type SeasonLike = { getCurrentSeason(): string }

const FESTIVAL_TYPES: Record<string, FestivalType> = {
  summer: 'harvest',
  winter: 'winter_feast',
  spring: 'spring_bloom',
  autumn: 'solstice',
}

const FESTIVAL_LABELS: Record<FestivalType, string> = {
  harvest: 'Harvest Festival',
  solstice: 'Solstice Celebration',
  spring_bloom: 'Spring Bloom Festival',
  winter_feast: 'Winter Feast',
}

const FESTIVAL_COLORS: Record<FestivalType, string> = {
  harvest: '#ffd700',
  solstice: '#ff8844',
  spring_bloom: '#88ff88',
  winter_feast: '#88ccff',
}

const CHECK_INTERVAL = 2000
const FESTIVAL_DURATION = 500
const FESTIVAL_CHANCE = 0.3
const RELATION_BOOST = 5
const MAX_ACTIVE = 4
const MAX_HISTORY = 20

let nextFestivalId = 1

export class SeasonFestivalSystem {
  private festivals: Festival[] = []
  private history: Festival[] = []
  private nextCheckTick = CHECK_INTERVAL
  private lastSeason = ''
  private displayAlpha = 0

  private _activeFestivalsBuf: Festival[] = []

  getActiveFestivals(): Festival[] {
    this._activeFestivalsBuf.length = 0
    for (const f of this.festivals) { if (f.active) this._activeFestivalsBuf.push(f) }
    return this._activeFestivalsBuf
  }

  update(dt: number, civManager: CivManagerLike, season: SeasonLike, tick: number): void {
    const curSeason = season.getCurrentSeason()
    if (curSeason !== this.lastSeason) {
      this.lastSeason = curSeason
      this.nextCheckTick = tick + 200
    }

    // End expired festivals
    for (const f of this.festivals) {
      if (f.active && tick >= f.startTick + f.duration) {
        f.active = false
        this.history.push(f)
        if (this.history.length > MAX_HISTORY) this.history.shift()
      }
    }
    for (let _i = this.festivals.length - 1; _i >= 0; _i--) { if (!((f) => f.active)(this.festivals[_i])) this.festivals.splice(_i, 1) }

    // Try to start new festivals
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      if (this.festivals.length < MAX_ACTIVE) {
        this.tryStartFestival(civManager, curSeason, tick)
      }
    }
  }

  private tryStartFestival(civManager: CivManagerLike, season: string, tick: number): void {
    const festType = FESTIVAL_TYPES[season]
    if (!festType) return

    const civs: CivLike[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    for (const civ of civs) {
      if (civ.population < 5) continue
      if (this.festivals.some(f => f.civId === civ.id)) continue
      if (Math.random() > FESTIVAL_CHANCE) continue

      const festival: Festival = {
        id: nextFestivalId++,
        civId: civ.id,
        type: festType,
        startTick: tick,
        duration: FESTIVAL_DURATION,
        active: true,
        moraleBoost: 15,
      }
      this.festivals.push(festival)

      // Boost relations with neighbors
      for (const [otherId, rel] of civ.relations) {
        if (rel > 0) civ.relations.set(otherId, rel + RELATION_BOOST)
      }

      EventLog.log('culture', `${civ.name} celebrates ${FESTIVAL_LABELS[festType]}!`, tick)
      break
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const active = this.getActiveFestivals()
    if (active.length === 0) {
      this.displayAlpha = Math.max(0, this.displayAlpha - 0.05)
      if (this.displayAlpha <= 0) return
    } else {
      this.displayAlpha = Math.min(1, this.displayAlpha + 0.05)
    }

    ctx.save()
    ctx.globalAlpha = this.displayAlpha * 0.85

    for (let i = 0; i < active.length; i++) {
      const f = active[i]
      const label = FESTIVAL_LABELS[f.type]
      const color = FESTIVAL_COLORS[f.type]
      const bx = ctx.canvas.width - 230, by = 100 + i * 30

      ctx.fillStyle = '#111'
      ctx.fillRect(bx, by, 220, 24)
      ctx.strokeStyle = color
      ctx.strokeRect(bx, by, 220, 24)
      ctx.fillStyle = color
      ctx.font = '11px monospace'
      ctx.fillText(`~ ${label}`, bx + 6, by + 16)
    }
    ctx.restore()
  }
}
