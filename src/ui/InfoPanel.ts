import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export class InfoPanel {
  private element: HTMLElement
  private world: World
  private em: EntityManager
  private civManager: CivManager

  constructor(elementId: string, world: World, em: EntityManager, civManager: CivManager) {
    this.element = document.getElementById(elementId)!
    this.world = world
    this.em = em
    this.civManager = civManager
  }

  update(fps: number = 0): void {
    const entityCount = this.em.getAllEntities().length
    const civCount = this.civManager.civilizations.size

    let civInfo = ''
    if (civCount > 0) {
      civInfo = '<div style="margin-top:4px;font-size:11px">'
      for (const [, civ] of this.civManager.civilizations) {
        civInfo += `<span style="color:${civ.color}">■</span> ${civ.name} (${civ.population}) `
      }
      civInfo += '</div>'

      // Diplomacy relations
      if (civCount > 1) {
        civInfo += '<div style="margin-top:4px;font-size:10px;color:#aaa">'
        const civArr = Array.from(this.civManager.civilizations.values())
        for (let i = 0; i < civArr.length; i++) {
          for (let j = i + 1; j < civArr.length; j++) {
            const rel = civArr[i].relations.get(civArr[j].id) ?? 0
            const label = this.civManager.getRelationLabel(rel)
            const relColor = rel > 50 ? '#2ecc71' : rel > 20 ? '#8bc34a' : rel > -20 ? '#888' : rel > -50 ? '#e67e22' : '#e74c3c'
            civInfo += `<span style="color:${civArr[i].color}">■</span>-<span style="color:${civArr[j].color}">■</span> <span style="color:${relColor}">${label} (${Math.round(rel)})</span> `
          }
        }
        civInfo += '</div>'
      }
    }

    this.element.innerHTML = `
      <div>FPS: ${fps} | Map: ${this.world.width}x${this.world.height} | Tick: ${this.world.tick} | Entities: ${entityCount} | Civs: ${civCount}</div>
      ${civInfo}
    `
  }
}
