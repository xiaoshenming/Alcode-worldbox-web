import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export class InfoPanel {
  private element: HTMLElement
  private world: World
  private em: EntityManager

  constructor(elementId: string, world: World, em: EntityManager) {
    this.element = document.getElementById(elementId)!
    this.world = world
    this.em = em
  }

  update(): void {
    const entityCount = this.em.getAllEntities().length
    this.element.innerHTML = `
      <div>Map: ${this.world.width}x${this.world.height} | Tick: ${this.world.tick}</div>
      <div>Creatures: ${entityCount}</div>
    `
  }
}
