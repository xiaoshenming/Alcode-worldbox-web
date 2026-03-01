// World Obsidian Flow System (v3.257) - Volcanic glass formations from rapid lava cooling
// Dark glassy landscapes where silica-rich lava solidified into razor-sharp obsidian fields

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface ObsidianFlow {
  id: number
  x: number
  y: number
  radius: number
  glassThickness: number
  sharpness: number
  reflectance: number
  fractureDensity: number
  coolingRate: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_FLOWS = 20

export class WorldObsidianFlowSystem {
  private flows: ObsidianFlow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flows.length < MAX_FLOWS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.flows.push({
          id: this.nextId++,
          x, y,
          radius: 3 + Math.floor(Math.random() * 5),
          glassThickness: 2 + Math.random() * 12,
          sharpness: 60 + Math.random() * 30,
          reflectance: 40 + Math.random() * 40,
          fractureDensity: 10 + Math.random() * 40,
          coolingRate: 20 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const flow of this.flows) {
      flow.glassThickness = Math.min(25, flow.glassThickness + 0.001)
      flow.sharpness = Math.max(30, flow.sharpness - 0.003)
      flow.reflectance = Math.max(20, Math.min(90, flow.reflectance + (Math.random() - 0.5) * 0.15))
      flow.fractureDensity = Math.min(80, flow.fractureDensity + 0.005)
      flow.coolingRate = Math.max(5, flow.coolingRate - 0.01)
    }

    const cutoff = tick - 88000
    for (let i = this.flows.length - 1; i >= 0; i--) {
      if (this.flows[i].tick < cutoff) this.flows.splice(i, 1)
    }
  }

}
