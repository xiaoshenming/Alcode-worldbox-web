// World Pumice Field System (v3.204) - Floating pumice rafts and deposits from volcanic eruptions
// Pumice fields drift on water, create new land, and provide lightweight building material

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface PumiceField {
  id: number
  x: number
  y: number
  size: number
  buoyancy: number
  mineralContent: number
  driftSpeed: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 1900
const SPAWN_CHANCE = 0.003
const MAX_FIELDS = 16

export class WorldPumiceFieldSystem {
  private fields: PumiceField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form on water near volcanic areas
      if (tile !== null && tile >= 0 && tile <= 1) {
        this.fields.push({
          id: this.nextId++,
          x, y,
          size: 5 + Math.random() * 30,
          buoyancy: 60 + Math.random() * 40,
          mineralContent: 15 + Math.random() * 40,
          driftSpeed: 0.2 + Math.random() * 0.8,
          age: 0,
          tick,
        })
      }
    }

    for (const f of this.fields) {
      f.age++
      f.buoyancy = Math.max(0, f.buoyancy - 0.03)
      f.size = Math.max(0, f.size - 0.01)
      f.mineralContent = Math.max(0, f.mineralContent - 0.005)
      // Drift movement
      f.x = Math.max(0, Math.min(world.width - 1, f.x + (Math.random() - 0.5) * f.driftSpeed))
      f.y = Math.max(0, Math.min(world.height - 1, f.y + (Math.random() - 0.5) * f.driftSpeed))
    }

    for (let i = this.fields.length - 1; i >= 0; i--) {
      if (this.fields[i].buoyancy <= 0 || this.fields[i].size <= 0) {
        this.fields.splice(i, 1)
      }
    }
  }

}
