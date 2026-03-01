// World Cloud Forest System (v3.212) - Misty high-altitude cloud forests
// Perpetual mist clings to ancient canopies where orchids bloom unseen and rare birds call through the fog

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface CloudForestZone {
  id: number; x: number; y: number
  moisture: number
  canopyDensity: number
  biodiversity: number
  mistLevel: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.003
const MAX_ZONES = 38

export class WorldCloudForestSystem {
  private zones: CloudForestZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width, h = world.height

    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break

      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile !== TileType.FOREST && tile !== TileType.MOUNTAIN) continue
      if (Math.random() > FORM_CHANCE) continue

      this.zones.push({
        id: this.nextId++,
        x, y,
        moisture: 60 + Math.random() * 40,
        canopyDensity: 50 + Math.random() * 50,
        biodiversity: 30 + Math.random() * 70,
        mistLevel: 40 + Math.random() * 60,
        tick
      })
    }

    const cutoff = tick - 56000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) this.zones.splice(i, 1)
    }
  }

}
