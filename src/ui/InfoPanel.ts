import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

/** Max diplomacy pairs to display to avoid DOM bloat */
const MAX_DIPLOMACY_PAIRS = 30

export class InfoPanel {
  private element: HTMLElement
  private world: World
  private em: EntityManager
  private civManager: CivManager

  // Cached DOM nodes for incremental updates
  private statsLine: HTMLDivElement | null = null
  private civListDiv: HTMLDivElement | null = null
  private diplomacyDiv: HTMLDivElement | null = null

  // Cache previous values to skip no-op updates
  private prevStatsText = ''
  private prevCivCount = -1
  private prevDiplomacyTick = -1

  constructor(elementId: string, world: World, em: EntityManager, civManager: CivManager) {
    this.element = document.getElementById(elementId)!
    this.world = world
    this.em = em
    this.civManager = civManager
    this.buildDOM()
  }

  private buildDOM(): void {
    this.element.innerHTML = ''

    this.statsLine = document.createElement('div')
    this.element.appendChild(this.statsLine)

    this.civListDiv = document.createElement('div')
    this.civListDiv.style.cssText = 'margin-top:4px;font-size:11px'
    this.element.appendChild(this.civListDiv)

    this.diplomacyDiv = document.createElement('div')
    this.diplomacyDiv.style.cssText = 'margin-top:4px;font-size:10px;color:#aaa'
    this.element.appendChild(this.diplomacyDiv)
  }

  update(fps: number = 0): void {
    const entityCount = this.em.getAllEntities().length
    const civCount = this.civManager.civilizations.size

    // 1) Stats line - update only when text changes
    const statsText = `FPS: ${fps} | Map: ${this.world.width}x${this.world.height} | Tick: ${this.world.tick} | Entities: ${entityCount} | Civs: ${civCount}`
    if (statsText !== this.prevStatsText) {
      if (this.statsLine) this.statsLine.textContent = statsText
      this.prevStatsText = statsText
    }

    // 2) Civ list - update via textContent on existing spans
    this.updateCivList(civCount)

    // 3) Diplomacy - update less frequently (every 300 ticks) and cap pairs
    const diplomacyTick = Math.floor(this.world.tick / 300)
    if (civCount > 1 && diplomacyTick !== this.prevDiplomacyTick) {
      this.prevDiplomacyTick = diplomacyTick
      this.updateDiplomacy()
    } else if (civCount <= 1 && this.diplomacyDiv?.firstChild) {
      this.diplomacyDiv.textContent = ''
    }
  }

  private updateCivList(civCount: number): void {
    const civListDiv = this.civListDiv
    if (!civListDiv) return
    if (civCount === 0) {
      if (civListDiv.firstChild) civListDiv.textContent = ''
      this.prevCivCount = 0
      return
    }

    const civs = Array.from(this.civManager.civilizations.values())

    // Rebuild only when civ count changes
    if (civCount !== this.prevCivCount) {
      this.prevCivCount = civCount
      civListDiv.textContent = ''
      for (const civ of civs) {
        const icon = document.createElement('span')
        icon.style.color = civ.color
        icon.textContent = '■'
        icon.dataset.civId = String(civ.id)
        icon.className = 'civ-icon'
        civListDiv.appendChild(icon)

        const label = document.createElement('span')
        label.dataset.civId = String(civ.id)
        label.className = 'civ-label'
        label.textContent = ` ${civ.name} (${civ.population}) `
        civListDiv.appendChild(label)
      }
    } else {
      // Incremental update: just update population text
      const labels = civListDiv.querySelectorAll('.civ-label')
      let idx = 0
      for (const civ of civs) {
        if (idx < labels.length) {
          const newText = ` ${civ.name} (${civ.population}) `
          if (labels[idx].textContent !== newText) {
            labels[idx].textContent = newText
          }
        }
        idx++
      }
    }
  }

  private updateDiplomacy(): void {
    const diplomacyDiv = this.diplomacyDiv
    if (!diplomacyDiv) return
    const civArr = Array.from(this.civManager.civilizations.values())
    const totalPairs = civArr.length * (civArr.length - 1) / 2

    // Use textContent for small sets, innerHTML with cap for large sets
    if (totalPairs <= MAX_DIPLOMACY_PAIRS) {
      this.renderDiplomacyPairs(civArr, totalPairs)
    } else {
      // Show only top relations (most extreme positive/negative)
      this.renderDiplomacyTopPairs(civArr)
    }
  }

  private renderDiplomacyPairs(civArr: { id: number; color: string; relations: Map<number, number> }[], _count: number): void {
    const parts: string[] = []
    for (let i = 0; i < civArr.length; i++) {
      for (let j = i + 1; j < civArr.length; j++) {
        const rel = civArr[i].relations.get(civArr[j].id) ?? 0
        const label = this.civManager.getRelationLabel(rel)
        const relColor = rel > 50 ? '#2ecc71' : rel > 20 ? '#8bc34a' : rel > -20 ? '#888' : rel > -50 ? '#e67e22' : '#e74c3c'
        parts.push(`<span style="color:${civArr[i].color}">■</span>-<span style="color:${civArr[j].color}">■</span> <span style="color:${relColor}">${label} (${Math.round(rel)})</span> `)
      }
    }
    this.diplomacyDiv!.innerHTML = parts.join('')
  }

  private renderDiplomacyTopPairs(civArr: { id: number; color: string; relations: Map<number, number> }[]): void {
    // Collect all pairs with their relation values
    const pairs: { i: number; j: number; rel: number }[] = []
    for (let i = 0; i < civArr.length; i++) {
      for (let j = i + 1; j < civArr.length; j++) {
        const rel = civArr[i].relations.get(civArr[j].id) ?? 0
        pairs.push({ i, j, rel })
      }
    }

    // Sort by absolute relation value (most extreme first)
    pairs.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel))
    const top = pairs.slice(0, MAX_DIPLOMACY_PAIRS)

    const parts: string[] = []
    for (const { i, j, rel } of top) {
      const label = this.civManager.getRelationLabel(rel)
      const relColor = rel > 50 ? '#2ecc71' : rel > 20 ? '#8bc34a' : rel > -20 ? '#888' : rel > -50 ? '#e67e22' : '#e74c3c'
      parts.push(`<span style="color:${civArr[i].color}">■</span>-<span style="color:${civArr[j].color}">■</span> <span style="color:${relColor}">${label} (${Math.round(rel)})</span> `)
    }

    if (pairs.length > MAX_DIPLOMACY_PAIRS) {
      parts.push(`<span style="color:#666">... +${pairs.length - MAX_DIPLOMACY_PAIRS} more</span>`)
    }

    this.diplomacyDiv!.innerHTML = parts.join('')
  }
}
