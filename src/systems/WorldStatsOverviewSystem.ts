import type { EntityManager } from '../ecs/Entity'
import type { CivManager } from '../civilization/CivManager'

const SPECIES_COLORS: Record<string, string> = {
  human: '#ffcc99', elf: '#99ffcc', dwarf: '#cc9966', orc: '#66cc66',
}

const MAX_HISTORY = 200
const SAMPLE_INTERVAL = 60
const PANEL_W = 320
const PANEL_H = 260
const MARGIN = 12

/**
 * World statistics overview panel.
 * Shows population curve, race distribution bar, war/peace counts, and civ aggregates.
 * Toggle with Tab key.
 */
export class WorldStatsOverviewSystem {
  private popHistory = new Float32Array(MAX_HISTORY)
  private histHead = 0
  private histCount = 0
  private lastSampleTick = -SAMPLE_INTERVAL

  private totalPop = 0
  private civCount = 0
  private buildingCount = 0
  private resourceTotal = 0
  private warCount = 0
  private peaceCount = 0
  // Cached war/peace display strings — rebuilt only when counts change
  private _warStr = 'War: 0'
  private _peaceStr = 'Peace: 0'
  private speciesCounts: Map<string, number> = new Map()
  private _speciesEntriesBuf: [string, number][] = []
  /** Cached count strings for species distribution bar — rebuilt in update() */
  private _speciesCountStrs: Map<string, string> = new Map()
  /** Cached population max label string — rebuilt when maxVal changes */
  private _prevMaxVal = -1
  private _maxValStr = ''
  private visible = false
  // Pre-allocated chart point to avoid [x,y] tuple allocation per point
  private _cpx = 0
  private _cpy = 0
  // Pre-allocated stats row to avoid 4-element object array creation per render
  // vs = cached string representation, only rebuilt when v changes
  private _statsRow: Array<{ l: string; v: number; vs: string; c: string }> = [
    { l: 'Pop', v: -1, vs: '0', c: '#4fc3f7' },
    { l: 'Civs', v: -1, vs: '0', c: '#aed581' },
    { l: 'Bldg', v: -1, vs: '0', c: '#ffb74d' },
    { l: 'Res', v: -1, vs: '0', c: '#ce93d8' },
  ]

  constructor() { /* no-op */ }

  toggle(): void { this.visible = !this.visible }
  isVisible(): boolean { return this.visible }

  /** Sample world data every SAMPLE_INTERVAL ticks. */
  update(tick: number, em: EntityManager, civManager: CivManager): void {
    if (tick - this.lastSampleTick < SAMPLE_INTERVAL) return
    this.lastSampleTick = tick

    let pop = 0
    this.speciesCounts.clear()
    const creatures = em.getEntitiesWithComponent('creature')
    for (let i = 0; i < creatures.length; i++) {
      const c = em.getComponent<{ type: 'creature'; species: string }>(creatures[i], 'creature')
      if (!c) continue
      pop++
      this.speciesCounts.set(c.species, (this.speciesCounts.get(c.species) ?? 0) + 1)
    }
    this.totalPop = pop

    // Ring buffer push
    if (this.histCount < MAX_HISTORY) {
      this.popHistory[this.histCount++] = pop
    } else {
      this.popHistory[this.histHead] = pop
      this.histHead = (this.histHead + 1) % MAX_HISTORY
    }

    const civs = civManager.civilizations
    this.civCount = civs.size
    let buildings = 0, resources = 0, wars = 0, peaces = 0
    for (const [, civ] of civs) {
      buildings += civ.buildings.length
      const r = civ.resources
      resources += r.food + r.wood + r.stone + r.gold
      for (const [, rel] of civ.relations) {
        if (rel <= -50) wars++
        else if (rel > 50) peaces++
      }
    }
    const wc = wars >> 1, pc = peaces >> 1
    if (this.warCount !== wc) { this.warCount = wc; this._warStr = `War: ${wc}` }
    if (this.peaceCount !== pc) { this.peaceCount = pc; this._peaceStr = `Peace: ${pc}` }
    this.buildingCount = buildings
    this.resourceTotal = resources
    // Rebuild sorted species entries cache + count strings
    this._speciesEntriesBuf.length = 0
    this._speciesCountStrs.clear()
    for (const e of this.speciesCounts.entries()) {
      this._speciesEntriesBuf.push(e)
      this._speciesCountStrs.set(e[0], String(e[1]))
    }
    this._speciesEntriesBuf.sort((a, b) => b[1] - a[1])
  }

  /** Helper: compute chart point coords from ring buffer — writes to _cpx/_cpy, no allocation */
  private chartPt(i: number, n: number, chartX: number, chartY: number, chartW: number, chartH: number, maxVal: number): void {
    const idx = n < MAX_HISTORY ? i : (this.histHead + i) % MAX_HISTORY
    this._cpx = chartX + (n > 1 ? i * (chartW / (n - 1)) : 0)
    this._cpy = chartY + chartH - (maxVal > 0 ? (this.popHistory[idx] / maxVal) * chartH : 0)
  }

  /** Render the overlay panel (screen-space, top-right corner). */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.visible) return
    const x = screenW - PANEL_W - MARGIN, y = MARGIN
    ctx.save()

    // Background
    ctx.fillStyle = 'rgba(8,10,18,0.9)'
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, PANEL_W, PANEL_H, 6)
    ctx.fill()
    ctx.stroke()

    // Title
    ctx.fillStyle = '#ccc'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('World Overview  [Tab]', x + 10, y + 8)

    // Summary row
    const sy = y + 28
    ctx.font = '10px monospace'
    const stats = this._statsRow
    const v0 = this.totalPop, v1 = this.civCount, v2 = this.buildingCount, v3 = Math.round(this.resourceTotal)
    if (stats[0].v !== v0) { stats[0].v = v0; stats[0].vs = String(v0) }
    if (stats[1].v !== v1) { stats[1].v = v1; stats[1].vs = String(v1) }
    if (stats[2].v !== v2) { stats[2].v = v2; stats[2].vs = String(v2) }
    if (stats[3].v !== v3) { stats[3].v = v3; stats[3].vs = String(v3) }
    const colW = (PANEL_W - 20) / stats.length
    for (let i = 0; i < stats.length; i++) {
      const lx = x + 10 + i * colW
      ctx.fillStyle = stats[i].c
      ctx.fillText(stats[i].l, lx, sy)
      ctx.fillStyle = '#fff'
      ctx.fillText(stats[i].vs, lx, sy + 13)
    }

    // War / Peace
    const wy = sy + 30
    ctx.fillStyle = '#ef5350'
    ctx.fillText(this._warStr, x + 10, wy)
    ctx.fillStyle = '#66bb6a'
    ctx.fillText(this._peaceStr, x + 100, wy)

    // Population history curve
    const cX = x + 10, cY = wy + 18, cW = PANEL_W - 20, cH = 80
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(cX, cY, cW, cH)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '9px monospace'
    ctx.fillText('Population History', cX, cY - 2)

    if (this.histCount > 1) {
      let maxVal = 1
      for (let i = 0; i < this.histCount; i++) {
        const idx = this.histCount < MAX_HISTORY ? i : (this.histHead + i) % MAX_HISTORY
        if (this.popHistory[idx] > maxVal) maxVal = this.popHistory[idx]
      }
      const n = this.histCount
      // Filled area
      ctx.beginPath()
      ctx.moveTo(cX, cY + cH)
      for (let i = 0; i < n; i++) { this.chartPt(i, n, cX, cY, cW, cH, maxVal); ctx.lineTo(this._cpx, this._cpy) }
      ctx.lineTo(cX + cW, cY + cH)
      ctx.closePath()
      ctx.fillStyle = 'rgba(79,195,247,0.15)'
      ctx.fill()
      // Line
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        this.chartPt(i, n, cX, cY, cW, cH, maxVal)
        i === 0 ? ctx.moveTo(this._cpx, this._cpy) : ctx.lineTo(this._cpx, this._cpy)
      }
      ctx.strokeStyle = '#4fc3f7'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Max label
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'right'
      if (maxVal !== this._prevMaxVal) { this._prevMaxVal = maxVal; this._maxValStr = String(Math.round(maxVal)) }
      ctx.fillText(this._maxValStr, cX + cW, cY + 8)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Waiting...', cX + cW / 2, cY + cH / 2)
    }

    // Species distribution bar
    const barY = cY + cH + 14, barH = 14
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '9px monospace'
    ctx.fillText('Species Distribution', cX, barY - 12)

    if (this.totalPop > 0) {
      let bx = cX
      const entries = this._speciesEntriesBuf
      for (const [species, count] of entries) {
        const segW = (count / this.totalPop) * cW
        if (segW < 1) continue
        ctx.fillStyle = SPECIES_COLORS[species] ?? '#888'
        ctx.fillRect(bx, barY, segW, barH)
        if (segW > 30) {
          ctx.fillStyle = '#000'
          ctx.font = '8px monospace'
          const countStr = this._speciesCountStrs.get(species) ?? String(count)
          ctx.fillText(`${species} ${countStr}`, bx + 3, barY + 3)
        }
        bx += segW
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(cX, barY, cW, barH)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(cX, barY, cW, barH)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('No creatures', cX + cW / 2, barY + 3)
    }

    ctx.restore()
  }
}
