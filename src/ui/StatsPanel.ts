import { EntityManager, CreatureComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization, TECH_TREE, CULTURE_ICONS, RELIGION_ICONS, RELIGION_NAMES } from '../civilization/Civilization'

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
    resLine.textContent = `🍖${Math.floor(civ.resources.food)} 🪵${Math.floor(civ.resources.wood)} 🪨${Math.floor(civ.resources.stone)} 💰${Math.floor(civ.resources.gold)} | Land: ${civ.territory.size}`
    row.appendChild(resLine)

    // Tech line
    const tech = TECH_TREE[civ.techLevel]
    const techLine = document.createElement('div')
    techLine.style.cssText = 'font-size:10px;margin-top:2px'

    const techBars = '■'.repeat(civ.techLevel) + '□'.repeat(5 - civ.techLevel)
    const barsSpan = document.createElement('span')
    barsSpan.style.color = '#f0c040'
    barsSpan.textContent = techBars
    techLine.appendChild(barsSpan)

    const techNameSpan = document.createElement('span')
    techNameSpan.style.color = '#cca'
    techNameSpan.textContent = ` ${tech?.name || 'Unknown'}`
    techLine.appendChild(techNameSpan)

    // Show unlocks
    if (tech && tech.unlocks.length > 0) {
      const unlockSpan = document.createElement('span')
      unlockSpan.style.cssText = 'color:#6a8;font-size:9px;margin-left:4px'
      unlockSpan.textContent = `[${tech.unlocks.join(', ')}]`
      techLine.appendChild(unlockSpan)
    }

    row.appendChild(techLine)

    // Culture line
    const cultureLine = document.createElement('div')
    cultureLine.style.cssText = 'font-size:10px;margin-top:2px'
    const cultureIcon = CULTURE_ICONS[civ.culture.trait]
    const strengthBar = Math.round(civ.culture.strength / 10)
    const strengthFill = '■'.repeat(strengthBar) + '□'.repeat(10 - strengthBar)
    const strengthSpan = document.createElement('span')
    strengthSpan.style.color = '#c0a0e0'
    strengthSpan.textContent = `${cultureIcon} ${civ.culture.trait}`
    cultureLine.appendChild(strengthSpan)
    const strengthValSpan = document.createElement('span')
    strengthValSpan.style.cssText = 'color:#a080c0;margin-left:6px;font-size:9px'
    strengthValSpan.textContent = `${strengthFill} ${Math.round(civ.culture.strength)}%`
    cultureLine.appendChild(strengthValSpan)
    row.appendChild(cultureLine)

    // Religion line
    const relLine = document.createElement('div')
    relLine.style.cssText = 'font-size:10px;margin-top:2px'
    const relIcon = RELIGION_ICONS[civ.religion.type]
    const faithBar = Math.round(civ.religion.faith / 10)
    const faithFill = '■'.repeat(faithBar) + '□'.repeat(10 - faithBar)
    const relSpan = document.createElement('span')
    relSpan.style.color = '#e0c0f0'
    relSpan.textContent = `${relIcon} ${RELIGION_NAMES[civ.religion.type]}`
    relLine.appendChild(relSpan)
    const faithSpan = document.createElement('span')
    faithSpan.style.cssText = 'color:#c0a0e0;margin-left:6px;font-size:9px'
    faithSpan.textContent = `${faithFill} ${Math.round(civ.religion.faith)}%`
    relLine.appendChild(faithSpan)
    if (civ.religion.blessing) {
      const blessSpan = document.createElement('span')
      blessSpan.style.cssText = 'color:#ffd700;margin-left:4px;font-size:9px'
      blessSpan.textContent = `✨${civ.religion.blessing}`
      relLine.appendChild(blessSpan)
    }
    row.appendChild(relLine)

    // Happiness line
    const happyLine = document.createElement('div')
    happyLine.style.cssText = 'font-size:10px;margin-top:2px'
    const happyBar = Math.round(civ.happiness / 10)
    const happyFill = '■'.repeat(happyBar) + '□'.repeat(10 - happyBar)
    const happyColor = civ.happiness > 60 ? '#8f8' : civ.happiness > 30 ? '#ff8' : '#f88'
    const happyIcon = civ.happiness > 60 ? '😊' : civ.happiness > 30 ? '😐' : '😠'
    const taxLabels = ['None', 'Low', 'Medium', 'High']
    const happySpan = document.createElement('span')
    happySpan.style.color = happyColor
    happySpan.textContent = `${happyIcon} ${happyFill} ${Math.round(civ.happiness)}%`
    happyLine.appendChild(happySpan)
    const taxSpan = document.createElement('span')
    taxSpan.style.cssText = 'color:#aaa;margin-left:6px;font-size:9px'
    taxSpan.textContent = `Tax: ${taxLabels[civ.taxRate]}`
    happyLine.appendChild(taxSpan)
    row.appendChild(happyLine)

    this.el.appendChild(row)
  }
}
