import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization, TECH_TREE, CULTURE_ICONS, RELIGION_ICONS, RELIGION_NAMES } from '../civilization/Civilization'

interface PopSnapshot {
  tick: number
  total: number
  byCiv: Map<number, number>
}

const MAX_HISTORY = 100

type TabKey = 'population' | 'power' | 'resources'

export class StatsPanel {
  private el: HTMLElement
  private em: EntityManager
  private civManager: CivManager
  private visible: boolean = false
  private history: PopSnapshot[] = []
  private lastRecordTick: number = 0
  private tab: TabKey = 'population'

  constructor(elementId: string, em: EntityManager, civManager: CivManager) {
    this.el = document.getElementById(elementId)!
    this.em = em
    this.civManager = civManager

    // Toggle button
    const btn = document.getElementById('statsToggle')
    if (btn) {
      btn.addEventListener('click', () => this.toggle())
    }
    // Also support statsBtn in top bar
    const btn2 = document.getElementById('statsBtn')
    if (btn2) {
      btn2.addEventListener('click', () => this.toggle())
    }
  }

  toggle(): void {
    this.visible = !this.visible
    this.el.style.display = this.visible ? 'block' : 'none'
    if (this.visible) this.render()
  }

  hide(): void {
    this.visible = false
    this.el.style.display = 'none'
  }

  isVisible(): boolean {
    return this.visible
  }

  /** Called every 300 ticks to record a population snapshot */
  recordSnapshot(tick: number): void {
    const byCiv = new Map<number, number>()
    for (const [id, civ] of this.civManager.civilizations) {
      byCiv.set(id, civ.population)
    }
    this.history.push({
      tick,
      total: this.em.getEntitiesWithComponents('position', 'creature').length,
      byCiv
    })
    if (this.history.length > MAX_HISTORY) this.history.shift()
  }

  update(tick: number = 0): void {
    // Record history every 120 ticks (~2 seconds at 60fps)
    if (tick - this.lastRecordTick >= 120) {
      this.lastRecordTick = tick
      this.recordSnapshot(tick)
    }

    if (!this.visible) return
    this.render()
  }

  private render(): void {
    // Clear panel
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild)
    }

    // Title
    const title = document.createElement('div')
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;font-size:13px;border-bottom:1px solid #555;padding-bottom:4px'
    title.textContent = 'World Statistics'
    this.el.appendChild(title)

    // Tab row
    const tabRow = document.createElement('div')
    tabRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px'
    const tabs: Array<{ key: TabKey; label: string }> = [
      { key: 'population', label: 'Population' },
      { key: 'power', label: 'Power' },
      { key: 'resources', label: 'Resources' }
    ]
    for (const t of tabs) {
      const btn = document.createElement('button')
      btn.textContent = t.label
      const isActive = this.tab === t.key
      btn.style.cssText = `padding:3px 10px;cursor:pointer;font-size:10px;border:1px solid ${isActive ? '#6a8aba' : '#4a4a6a'};border-radius:4px;background:${isActive ? '#4a6a9a' : '#2a2a4a'};color:${isActive ? '#fff' : '#aaa'}`
      btn.addEventListener('click', () => {
        this.tab = t.key
        this.render()
      })
      tabRow.appendChild(btn)
    }
    this.el.appendChild(tabRow)

    if (this.tab === 'population') this.renderPopulation()
    else if (this.tab === 'power') this.renderPower()
    else this.renderResources()
  }

  private renderPopulation(): void {
    // Canvas chart
    const canvas = document.createElement('canvas')
    canvas.width = 340
    canvas.height = 150
    canvas.style.cssText = 'background:#111;border-radius:4px;width:100%'
    this.el.appendChild(canvas)

    const ctx = canvas.getContext('2d')!
    if (this.history.length < 2) {
      ctx.fillStyle = '#888'
      ctx.font = '12px monospace'
      ctx.fillText('Collecting data...', 100, 75)
    } else {
      this.drawPopChart(ctx, canvas.width, canvas.height)
    }

    // Species breakdown below chart
    const speciesCount = new Map<string, number>()
    const entities = this.em.getEntitiesWithComponents('creature')
    for (const id of entities) {
      const c = this.em.getComponent<CreatureComponent>(id, 'creature')!
      speciesCount.set(c.species, (speciesCount.get(c.species) || 0) + 1)
    }

    const speciesHeader = document.createElement('div')
    speciesHeader.style.cssText = 'color:#aaa;font-size:10px;margin:8px 0 3px 0;text-transform:uppercase;letter-spacing:1px'
    speciesHeader.textContent = 'Population by Species'
    this.el.appendChild(speciesHeader)

    const sorted = Array.from(speciesCount.entries()).sort((a, b) => b[1] - a[1])
    for (const [species, count] of sorted) {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:1px;font-size:11px'
      const name = document.createElement('span')
      name.textContent = species
      row.appendChild(name)
      const num = document.createElement('span')
      num.style.color = '#8f8'
      num.textContent = String(count)
      row.appendChild(num)
      this.el.appendChild(row)
    }
  }

  private drawPopChart(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const pad = 30

    // Find max population
    let maxPop = 1
    for (const snap of this.history) {
      if (snap.total > maxPop) maxPop = snap.total
    }

    const cw = w - pad * 2
    const ch = h - pad * 2

    // Grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = pad + (ch / 4) * i
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(pad + cw, y)
      ctx.stroke()
      ctx.fillStyle = '#666'
      ctx.font = '9px monospace'
      ctx.fillText(String(Math.round(maxPop * (1 - i / 4))), 2, y + 3)
    }

    // Total population line (white)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < this.history.length; i++) {
      const x = pad + (this.history.length > 1 ? (i / (this.history.length - 1)) * cw : 0)
      const y = pad + ch - (maxPop > 0 ? (this.history[i].total / maxPop) * ch : 0)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Per-civ lines
    const civIds = new Set<number>()
    for (const snap of this.history) {
      for (const id of snap.byCiv.keys()) civIds.add(id)
    }
    for (const civId of civIds) {
      const civ = this.civManager.civilizations.get(civId)
      if (!civ) continue
      ctx.strokeStyle = civ.color
      ctx.lineWidth = 1
      ctx.beginPath()
      let started = false
      for (let i = 0; i < this.history.length; i++) {
        const pop = this.history[i].byCiv.get(civId) ?? 0
        const x = pad + (this.history.length > 1 ? (i / (this.history.length - 1)) * cw : 0)
        const y = pad + ch - (maxPop > 0 ? (pop / maxPop) * ch : 0)
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Label
    ctx.fillStyle = '#aaa'
    ctx.font = '10px monospace'
    ctx.fillText('Population History', pad, 12)
  }

  private renderPower(): void {
    const civs = Array.from(this.civManager.civilizations.values())
    if (civs.length === 0) {
      const msg = document.createElement('div')
      msg.style.cssText = 'color:#888;text-align:center;padding:20px'
      msg.textContent = 'No civilizations yet'
      this.el.appendChild(msg)
      return
    }

    // Score: population*2 + territory/10 + buildings*3 + techLevel*20 + gold/5
    const scored = civs.map(c => ({
      civ: c,
      score: c.population * 2 + c.territory.size / 10 + c.buildings.length * 3 + c.techLevel * 20 + (c.resources.gold ?? 0) / 5
    })).sort((a, b) => b.score - a.score)

    const maxScore = scored[0]?.score || 1

    const header = document.createElement('div')
    header.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px'
    header.textContent = 'Civilization Power Rankings'
    this.el.appendChild(header)

    for (let i = 0; i < scored.length; i++) {
      const { civ, score } = scored[i]
      const row = document.createElement('div')
      row.style.cssText = 'margin:4px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:4px'

      // Name + score header
      const nameRow = document.createElement('div')
      nameRow.style.cssText = 'display:flex;justify-content:space-between;font-size:11px'
      const nameSpan = document.createElement('span')
      nameSpan.style.color = civ.color
      nameSpan.style.fontWeight = 'bold'
      nameSpan.textContent = `#${i + 1} ${civ.name}`
      const scoreSpan = document.createElement('span')
      scoreSpan.style.color = '#aaa'
      scoreSpan.textContent = `${Math.round(score)} pts`
      nameRow.appendChild(nameSpan)
      nameRow.appendChild(scoreSpan)
      row.appendChild(nameRow)

      // Progress bar
      const bar = document.createElement('div')
      bar.style.cssText = 'height:6px;background:#222;border-radius:3px;overflow:hidden;margin:3px 0'
      const fill = document.createElement('div')
      fill.style.cssText = `height:100%;background:${civ.color};width:${(score / maxScore) * 100}%;border-radius:3px;transition:width 0.3s`
      bar.appendChild(fill)
      row.appendChild(bar)

      // Detail line
      const detail = document.createElement('div')
      detail.style.cssText = 'font-size:9px;color:#777;display:flex;gap:6px;flex-wrap:wrap'

      const items = [
        `Pop: ${civ.population}`,
        `Land: ${civ.territory.size}`,
        `Tech: ${civ.techLevel}`,
        `Bldg: ${civ.buildings.length}`,
        `Stance: ${civ.diplomaticStance}`
      ]
      for (const item of items) {
        const span = document.createElement('span')
        span.textContent = item
        detail.appendChild(span)
      }
      row.appendChild(detail)

      // Tech + culture line
      const techLine = document.createElement('div')
      techLine.style.cssText = 'font-size:9px;margin-top:2px;color:#999'
      const tech = TECH_TREE[civ.techLevel]
      const cultureIcon = CULTURE_ICONS[civ.culture.trait]
      const relIcon = RELIGION_ICONS[civ.religion.type]
      techLine.textContent = `${tech?.name || '?'} | ${cultureIcon} ${civ.culture.trait} | ${relIcon} ${RELIGION_NAMES[civ.religion.type]}`
      row.appendChild(techLine)

      this.el.appendChild(row)
    }
  }

  private renderResources(): void {
    const civs = Array.from(this.civManager.civilizations.values())
    if (civs.length === 0) {
      const msg = document.createElement('div')
      msg.style.cssText = 'color:#888;text-align:center;padding:20px'
      msg.textContent = 'No civilizations yet'
      this.el.appendChild(msg)
      return
    }

    // World totals
    let totalFood = 0, totalWood = 0, totalStone = 0, totalGold = 0
    for (const c of civs) {
      totalFood += c.resources.food
      totalWood += c.resources.wood
      totalStone += c.resources.stone
      totalGold += c.resources.gold
    }

    const summary = document.createElement('div')
    summary.style.cssText = 'margin-bottom:8px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px'

    const titleEl = document.createElement('div')
    titleEl.style.cssText = 'font-weight:bold;margin-bottom:4px;font-size:11px'
    titleEl.textContent = 'World Total'
    summary.appendChild(titleEl)

    const totals = document.createElement('div')
    totals.style.cssText = 'display:flex;gap:10px;font-size:11px'
    const items = [
      { label: 'Food', val: totalFood, color: '#8f8' },
      { label: 'Wood', val: totalWood, color: '#a86' },
      { label: 'Stone', val: totalStone, color: '#aaa' },
      { label: 'Gold', val: totalGold, color: '#fd0' }
    ]
    for (const item of items) {
      const span = document.createElement('span')
      span.style.color = item.color
      span.textContent = `${item.label}: ${Math.round(item.val)}`
      totals.appendChild(span)
    }
    summary.appendChild(totals)
    this.el.appendChild(summary)

    // Per-civ resources
    const civHeader = document.createElement('div')
    civHeader.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px'
    civHeader.textContent = 'By Civilization'
    this.el.appendChild(civHeader)

    const sortedCivs = [...civs].sort((a, b) => {
      const totalA = a.resources.food + a.resources.wood + a.resources.stone + a.resources.gold
      const totalB = b.resources.food + b.resources.wood + b.resources.stone + b.resources.gold
      return totalB - totalA
    })

    for (const civ of sortedCivs) {
      const row = document.createElement('div')
      row.style.cssText = 'margin:3px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:4px'

      const nameEl = document.createElement('div')
      nameEl.style.cssText = `color:${civ.color};font-weight:bold;font-size:11px;margin-bottom:2px`
      nameEl.textContent = civ.name
      row.appendChild(nameEl)

      const resRow = document.createElement('div')
      resRow.style.cssText = 'display:flex;gap:8px;font-size:10px;color:#999'
      const resItems = [
        { label: 'F', val: civ.resources.food, color: '#8f8' },
        { label: 'W', val: civ.resources.wood, color: '#a86' },
        { label: 'S', val: civ.resources.stone, color: '#aaa' },
        { label: 'G', val: civ.resources.gold, color: '#fd0' }
      ]
      for (const r of resItems) {
        const span = document.createElement('span')
        span.style.color = r.color
        span.textContent = `${r.label}:${Math.round(r.val)}`
        resRow.appendChild(span)
      }
      row.appendChild(resRow)

      // Happiness bar
      const happyRow = document.createElement('div')
      happyRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px'
      const happyColor = civ.happiness > 60 ? '#8f8' : civ.happiness > 30 ? '#ff8' : '#f88'
      const happyBar = document.createElement('div')
      happyBar.style.cssText = 'flex:1;height:4px;background:#222;border-radius:2px;overflow:hidden'
      const happyFill = document.createElement('div')
      happyFill.style.cssText = `height:100%;background:${happyColor};width:${civ.happiness}%;border-radius:2px`
      happyBar.appendChild(happyFill)
      const happyLabel = document.createElement('span')
      happyLabel.style.cssText = `font-size:9px;color:${happyColor}`
      happyLabel.textContent = `${Math.round(civ.happiness)}%`
      happyRow.appendChild(happyBar)
      happyRow.appendChild(happyLabel)
      row.appendChild(happyRow)

      this.el.appendChild(row)
    }
  }
}
