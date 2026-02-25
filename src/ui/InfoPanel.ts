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
    }

    this.element.innerHTML = `
      <div>FPS: ${fps} | Map: ${this.world.width}x${this.world.height} | Tick: ${this.world.tick} | Entities: ${entityCount} | Civs: ${civCount}</div>
      ${civInfo}
    `
  }
}
