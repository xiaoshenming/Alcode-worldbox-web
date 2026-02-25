import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export class StatsPanel {
  private el: HTMLElement
  private em: EntityManager
  private civManager: CivManager
  private visible: boolean = false

  constructor(elementId: string, em: EntityManager, civManager: CivManager) {
    this.el = document.getElementById(elementId)!
    this.em = em
    this.civManager = civManager

    // Toggle button
    const btn = document.getElementById('statsToggle')
    if (btn) {
      btn.addEventListener('click', () => this.toggle())
    }
  }

  toggle(): void {
    this.visible = !this.visible
    this.el.style.display = this.visible ? 'block' : 'none'
  }

  update(): void {
    if (!this.visible) return

    // Count species
    const speciesCount = new Map<string, number>()
    const entities = this.em.getEntitiesWithComponents('creature')
    for (const id of entities) {
      const c = this.em.getComponent<CreatureComponent>(id, 'creature')!
      speciesCount.set(c.species, (speciesCount.get(c.species) || 0) + 1)
    }

    // Sort civs by population
    const civs = Array.from(this.civManager.civilizations.values())
      .sort((a, b) => b.population - a.population)

    // Build DOM
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild)
    }

    // Title
    const title = document.createElement('div')
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;font-size:13px;border-bottom:1px solid #555;padding-bottom:4px'
    title.textContent = `World Statistics (${entities.length} creatures)`
    this.el.appendChild(title)

    // Species section
    const speciesHeader = document.createElement('div')
    speciesHeader.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:3px;margin-top:4px'
    speciesHeader.textContent = 'POPULATION BY SPECIES'
    this.el.appendChild(speciesHeader)

    const sorted = Array.from(speciesCount.entries()).sort((a, b) => b[1] - a[1])
    for (const [species, count] of sorted) {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:1px'

      const name = document.createElement('span')
      name.textContent = species
      row.appendChild(name)

      const num = document.createElement('span')
      num.style.color = '#8f8'
      num.textContent = String(count)
      row.appendChild(num)

      this.el.appendChild(row)
    }

    // Civ rankings
    if (civs.length > 0) {
      const civHeader = document.createElement('div')
      civHeader.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:3px;margin-top:8px'
      civHeader.textContent = 'CIVILIZATION RANKINGS'
      this.el.appendChild(civHeader)

      for (let i = 0; i < civs.length; i++) {
        const civ = civs[i]
        this.renderCivRow(civ, i + 1)
      }
    }
  }

  private renderCivRow(civ: Civilization, rank: number): void {
    const row = document.createElement('div')
    row.style.cssText = 'margin-bottom:4px;padding:2px 0;border-bottom:1px solid #333'

    // Name line
    const nameLine = document.createElement('div')
    nameLine.style.cssText = 'display:flex;justify-content:space-between'

    const nameSpan = document.createElement('span')
    nameSpan.style.color = civ.color
    nameSpan.textContent = `#${rank} ${civ.name}`
    nameLine.appendChild(nameSpan)

    const popSpan = document.createElement('span')
    popSpan.textContent = `Pop: ${civ.population}`
    nameLine.appendChild(popSpan)

    row.appendChild(nameLine)

    // Resources line
    const resLine = document.createElement('div')
    resLine.style.cssText = 'font-size:10px;color:#aaa;margin-top:1px'
    resLine.textContent = `🍖${Math.floor(civ.resources.food)} 🪵${Math.floor(civ.resources.wood)} 🪨${Math.floor(civ.resources.stone)} 💰${Math.floor(civ.resources.gold)} | Tech: ${civ.techLevel} | Land: ${civ.territory.size}`
    row.appendChild(resLine)

    this.el.appendChild(row)
  }
}
