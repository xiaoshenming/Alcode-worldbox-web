import { World } from '../game/World'

export class InfoPanel {
  private element: HTMLElement
  private world: World

  constructor(elementId: string, world: World) {
    this.element = document.getElementById(elementId)!
    this.world = world
  }

  update(): void {
    this.element.innerHTML = `
      <div>Map: ${this.world.width}x${this.world.height}</div>
      <div>Tick: ${this.world.tick}</div>
    `
  }
}
