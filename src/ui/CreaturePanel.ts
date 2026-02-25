import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'

export class CreaturePanel {
  private panel: HTMLElement
  private em: EntityManager
  private civManager: CivManager
  private selectedId: EntityId | null = null

  constructor(panelId: string, em: EntityManager, civManager: CivManager) {
    this.panel = document.getElementById(panelId)!
    this.em = em
    this.civManager = civManager
  }

  select(entityId: EntityId | null): void {
    this.selectedId = entityId
    if (!entityId) {
      this.panel.style.display = 'none'
      return
    }
    this.update()
    this.panel.style.display = 'block'
  }

  getSelected(): EntityId | null {
    return this.selectedId
  }

  update(): void {
    if (!this.selectedId) return

    const creature = this.em.getComponent<CreatureComponent>(this.selectedId, 'creature')
    const needs = this.em.getComponent<NeedsComponent>(this.selectedId, 'needs')
    const pos = this.em.getComponent<PositionComponent>(this.selectedId, 'position')

    if (!creature || !needs || !pos) {
      this.select(null)
      return
    }

    const civMember = this.em.getComponent<CivMemberComponent>(this.selectedId, 'civMember')
    let civName = 'None'
    if (civMember) {
      const civ = this.civManager.civilizations.get(civMember.civId)
      if (civ) civName = civ.name
    }

    const genderIcon = creature.gender === 'male' ? '♂' : '♀'
    const ageYears = Math.floor(creature.age)

    // Clear and rebuild with safe DOM methods
    this.panel.textContent = ''

    const title = document.createElement('div')
    title.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:6px'
    title.textContent = `${creature.name} ${genderIcon}`
    this.panel.appendChild(title)

    this.addRow('Species', creature.species)
    this.addRow('Age', `${ageYears} / ${Math.floor(creature.maxAge)}`)
    this.addBarRow('Health', needs.health, 100, '#4a4')
    this.addBarRow('Hunger', needs.hunger, 100, '#a44')
    this.addRow('Civ', civName)
    this.addRow('Pos', `(${Math.floor(pos.x)}, ${Math.floor(pos.y)})`)
  }

  private addRow(label: string, value: string): void {
    const row = document.createElement('div')
    row.textContent = `${label}: ${value}`
    this.panel.appendChild(row)
  }

  private addBarRow(label: string, value: number, max: number, color: string): void {
    const row = document.createElement('div')
    row.textContent = `${label}: `

    const barOuter = document.createElement('span')
    barOuter.style.cssText = 'display:inline-block;width:60px;height:8px;background:#333;border-radius:4px;vertical-align:middle'

    const barInner = document.createElement('span')
    const pct = Math.max(0, Math.min(100, (value / max) * 100))
    barInner.style.cssText = `display:block;width:${pct}%;height:100%;background:${color};border-radius:4px`

    barOuter.appendChild(barInner)
    row.appendChild(barOuter)

    const num = document.createElement('span')
    num.textContent = ` ${Math.floor(value)}`
    row.appendChild(num)

    this.panel.appendChild(row)
  }
}
